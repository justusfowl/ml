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

class OCRProcessor:

    def __init__(self, **kwargs):

        self.db = DB()

        self.label_obj = None

        if 'dev' in kwargs:
            print("Run in development mode...")
        else:
            self.connection = pika.BlockingConnection(self.db.mq_conn_params)
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue=os.environ.get("MQ_QUEUE_OCR"), durable=True)
            self.channel.basic_qos(prefetch_count=1)

    def process_label_object(self):

        img = Image.open(self.label_obj["filePath"])

        for p in self.label_obj["pages"]:

            if "bbox" in p:

                bbox = p["bbox"]

                img_size = img.size
                img_width = img_size[0]
                img_height = img_size[1]

                left = img_width * bbox["relX"]
                top = img_height * bbox["relY"]
                right = left + bbox["relWidth"] * img_width
                bottom = top + bbox["relHeight"] * img_height

                cropped_img = img.crop((left, top, right, bottom))

                read_text = pytesseract.image_to_string(cropped_img) # , lang="deu")
                p["read_text"] = read_text

    def dev(self, objId):
        self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(objId)})
        self.process_label_object()

        self.store_obj()

    def store_obj(self):

        self.label_obj["wfstatus"] = 2

        self.label_obj["wfstatus_change"] = [
            {
                "timeChange" : dt.datetime.now(pytz.utc),
                "wfstatus" : 2
            }
        ]

        self.db.mongo_db.labels.update({"_id": self.label_obj["_id"]}, self.label_obj, upsert=True)

    def callback(self, ch, method, properties, body):


        requestParams = json.loads(body.decode('utf-8'))

        object_id = str(requestParams["_id"])

        print("Processing...%s" % object_id)

        self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(object_id)})
        self.process_label_object()
        self.store_obj()

        ch.basic_ack(delivery_tag=method.delivery_tag)

    def init_consuming(self):

        # receive message and complete simulation
        self.channel.basic_consume(on_message_callback=self.callback, queue='medlines')
        self.channel.start_consuming()
        print("start consuming...")

