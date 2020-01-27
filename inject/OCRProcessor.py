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
from SpellChecker import Speller

from ProgressHandler import PH


class OCRProcessor:

    def __init__(self, **kwargs):

        self.db = DB()

        self.label_obj = None

        self.progressHandler = PH()

        if 'dev' in kwargs:
            print("Run in development mode...")

            self.flagDev = True
            self.spellChecker = Speller()

        else:

            self.spellChecker = Speller(dev=True)

            self.flagDev = False

            self.connection = pika.BlockingConnection(self.db.mq_conn_params)
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue=os.environ.get("MQ_QUEUE_OCR"), durable=True)
            self.channel.basic_qos(prefetch_count=1)

    def process_label_object(self):

        cnt_p = 1

        for p in self.label_obj["pages"]:

            if "bbox" in p and p["bbox"]:

                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Page " + str(cnt_p), category="OCR")

                img = Image.open(p["path"])

                bbox = p["bbox"]

                img_size = img.size
                img_width = img_size[0]
                img_height = img_size[1]

                left = img_width * bbox["relX"]
                top = img_height * bbox["relY"]
                right = left + bbox["relWidth"] * img_width
                bottom = top + bbox["relHeight"] * img_height

                cropped_img = img.crop((left, top, right, bottom))

                if self.flagDev:
                    # in dev, tesseract 4.00alpha creates issues with dedicated language files
                    read_text = pytesseract.image_to_string(cropped_img)  # , lang="deu")
                else:
                    read_text = pytesseract.image_to_string(cropped_img, lang="deu", config='--psm 6')

                p["read_text_raw"] = read_text
                p["read_text"] = self.spellChecker.check_string(read_text)

                cnt_p = cnt_p + 1

    def dev(self, objId):
        self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(objId)})
        self.process_label_object()

        self.store_obj()

    def store_obj(self):



        self.label_obj["wfstatus"] = 2

        self.label_obj["wfstatus_change"].append(
            {
                "timeChange" : dt.datetime.now(pytz.utc),
                "wfstatus" : 2
            }
        )

        self.db.mongo_db.labels.update({"_id": self.label_obj["_id"]}, self.label_obj, upsert=True)



    def publish_to_pretagging(self):
        msg = {"_id": str(self.label_obj["_id"])}
        self.channel.basic_publish(exchange='', routing_key=os.environ.get("MQ_QUEUE_PRETAG"), body=json.dumps(msg))



    def callback(self, ch, method, properties, body):

        try:
            requestParams = json.loads(body.decode('utf-8'))

            object_id = str(requestParams["_id"])

            print("Processing...%s" % object_id)

            self.progressHandler.pub_to(object_id, "OCR Processing started", "OCR", details={"start" : True})

            self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(object_id)})

            if not self.label_obj:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                self.progressHandler.pub_to(object_id, "Fatal error, object cannot be found in database. Is dropped.", "OCR", details={"complete" : True})


            else:

                self.process_label_object()

                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Update workflow status == 2 ", "OCR")
                self.store_obj()
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Object stored", "OCR")

                self.publish_to_pretagging()
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "Published to pretagging", "OCR", details={"complete" : True})

                ch.basic_ack(delivery_tag=method.delivery_tag)

                print("Completed for %s" % object_id)


        except Exception as e:
            print("File could not be processed... %s" % object_id, e)

            if method.delivery_tag > 100 and method.redelivered:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                self.progressHandler.pub_to(object_id, "Fatal error, object cannot be processed. Is dropped.", "OCR", details={"complete": True}, error=e)
            else:
                ch.basic_reject(delivery_tag=method.delivery_tag, requeue=True)
                self.progressHandler.pub_to(str(self.label_obj["_id"]), "File rejected", "OCR", error=e)

    def init_consuming(self):
        print("start consuming...")
        # receive message and complete simulation
        self.channel.basic_consume(on_message_callback=self.callback, queue='medlines')
        self.channel.start_consuming()


