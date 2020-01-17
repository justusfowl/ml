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
        self.process_pretag_object()

        self.store_obj()

    def process_pretag_object(self):
        cnt_p = 1
        for p in self.label_obj["pages"]:
            if "read_text" in p:
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Pretagging page: " + str(cnt_p))
                p["entities"] = self.pre_tagger.get_entities_from_text(p["read_text"])
                cnt_p = cnt_p +1

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
            self.progressHandler.pub_to(str(object_id), "Pretagging initiated")
            self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(object_id)})
            self.process_pretag_object()
            self.progressHandler.pub_to(str(object_id), "Pretagging completed")
            self.progressHandler.pub_to(str(object_id), "Update workflow status == 3")
            self.store_obj()
            self.progressHandler.pub_to(str(object_id), "Object stored")

            ch.basic_ack(delivery_tag=method.delivery_tag)

            print("Completed for %s" % object_id)

        except Exception as e:
            print("File could not be processed... %s" % object_id, e)
            ch.basic_reject(delivery_tag=method.delivery_tag, requeue=True)



    def init_consuming(self):
        print("start consuming...")
        # receive message and complete simulation
        self.channel.basic_consume(on_message_callback=self.callback, queue=os.environ.get("MQ_QUEUE_PRETAG"))
        self.channel.start_consuming()


