# coding: utf-8

from PIL import Image
import pytesseract
import os
from bson.objectid import ObjectId
import pika
import json
import datetime as dt
import pytz

from dbal import DB
from medlang import PreTagger

from ProgressHandler import PH

class MedLangProcessor:

    def __init__(self, **kwargs):

        self.db = DB()

        self.label_obj = None

        self.pre_tagger = PreTagger()

        self.progressHandler = PH()

        if 'dev' in kwargs:
            print("Run in development mode...")

            self.flagDev = True

        else:

            self.flagDev = False

            self.connection = pika.BlockingConnection(self.db.mq_conn_params)
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue=os.environ.get("MQ_QUEUE_PRETAG"), durable=True)
            self.channel.basic_qos(prefetch_count=1)

    def dev(self, objId):
        self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(objId)})

        # in_text = "Für den unten stehenden Versicherten benötigen wir neue Verordnungen. Versicherter: Heinz Lorch (geb120.09.1936; ROSenstraße 9. 65343 Eltville am Rhein; Versichertennummer: V221991825) Auslaufende VO: Verordnung 21.10.2019 s 1.11.2019 Verordnete Behandlungspflege Wundversorgung Präparate Verband. Diagnose ist {Z32.3I}."

        # in_text = "Für den unten stehenden Versicherten benötigen wir neue Verordnungen. Versicherter: Heinz Lorch (geb120.09.1936; ROSenstraße 9. 65343 Eltville am Rhein; Versichertennummer: V221991825) Auslaufende VO: Verordnung 21.10.2019 s 1.11.2019 Verordnete Behandlungspflege Wundversorgung Präparate Verband. Diagnose ist {Z32.3I}."
        in_text = self.label_obj["pages"][0]["read_text"]
        out_text, entities, details = self.pre_tagger.get_entities_from_text(in_text)

        print(out_text)
        print(entities)
        print(details)

        # self.process_pretag_object()

        # self.store_obj()

    def process_pretag_object(self):
        cnt_p = 1
        for p in self.label_obj["pages"]:
            if "read_text" in p:
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Pretagging page: " + str(cnt_p), category="Pretag")
                p["read_text"], p["entities"], p["details"] = self.pre_tagger.get_entities_from_text(p["read_text"])
                cnt_p = cnt_p + 1

    def store_obj(self):

        self.label_obj["wfstatus"] = 3

        self.label_obj["wfstatus_change"].append(
            {
                "timeChange" : dt.datetime.now(pytz.utc),
                "wfstatus" : 3
            }
        )

        self.db.mongo_db.labels.update({"_id": self.label_obj["_id"]}, self.label_obj, upsert=True)

    def callback(self, ch, method, properties, body):

        try:
            requestParams = json.loads(body.decode('utf-8'))

            object_id = str(requestParams["_id"])

            print("Processing...%s" % object_id)
            self.progressHandler.join_room(object_id)

            self.progressHandler.pub_to(str(object_id), "Pretagging initiated", "Pretag", details={"start" : True})
            self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(object_id)})

            if not self.label_obj:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                self.progressHandler.pub_to(object_id, "Fatal error, object cannot be found in database. Is dropped.", "Pretag", details={"complete" : True})
                self.progressHandler.leave_room(object_id)
            else:
                self.process_pretag_object()
                self.progressHandler.pub_to(str(object_id), "Pretagging completed", "Pretag")
                self.progressHandler.pub_to(str(object_id), "Update workflow status == 3", "Pretag")
                self.store_obj()
                self.progressHandler.pub_to(str(object_id), "Object stored", details={"complete" : True})

                ch.basic_ack(delivery_tag=method.delivery_tag)

                print("Completed for %s" % object_id)
                self.progressHandler.leave_room(object_id)

        except Exception as e:
            print("File could not be processed... %s" % object_id, e)
            if method.delivery_tag > 100 and method.redelivered:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                self.progressHandler.pub_to(object_id, "Fatal error, object cannot be processed. Is dropped.", "OCR", details={"complete": True}, error=e)

            else:
                ch.basic_reject(delivery_tag=method.delivery_tag, requeue=True)
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "File rejected", "Pretag", error=e)

            self.progressHandler.leave_room(object_id)



    def init_consuming(self):
        print("start consuming...")
        # receive message and complete simulation
        self.channel.basic_consume(on_message_callback=self.callback, queue=os.environ.get("MQ_QUEUE_PRETAG"))
        self.channel.start_consuming()


