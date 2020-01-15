import os
import requests
import pika
import json
from pathlib import Path
from dbal import DB
from bson.objectid import ObjectId

class PDFLoader:

    def __init__(self, dir, **kwargs):

        self.db = DB()

        self.dir = dir

        self.files = []

        self.load_files()
        self.process_files()

    def load_files(self):
        for filename in Path(self.dir).rglob('*.pdf'):
            self.files.append(filename)

    def process_files(self):
        for f in self.files:
            self.post_file(f)

    def post_file(self, file_path):

        print("Posting file... %s" % file_path)

        multipart_form_data = {
            'file': open(file_path, 'rb')
        }

        response = requests.post('http://{apiBase}:{apiPort}{apiEndPoint}'.format(
            apiBase=os.environ.get("LOADER_API_BASE"),
            apiPort=os.environ.get("LOADER_API_PORT"),
            apiEndPoint=os.environ.get("LOADER_API_ENDPOINT")
        ),files=multipart_form_data)

        print("Result for %s ends with %s" % (file_path, response.status_code))

class ProcessLoader:
    def __init__(self, **kwargs):

        # targetq = 'medlines'

        self.db = DB()

        if 'targetq' not in kwargs or kwargs["targetq"] is None:
            raise Exception("No target queue provided")
        else:
            self.targetq = kwargs["targetq"]

        if not 'objIds' in kwargs:
            self.objIds = []
            self.loadall = True
        else:
            self.objIds = kwargs["objIds"]
            self.loadall = False

        self.connection = pika.BlockingConnection(self.db.mq_conn_params)
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=self.targetq, durable=True)
        # self.channel.basic_qos(prefetch_count=1)

    def load_obj(self):

        if len(self.objIds) > 0:

            for id in self.objIds:

                # self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(self.objId)})

                # self.channel.basic_consume(on_message_callback=self.callback, queue='medlines')

                msg = {"_id" : id}

                self.channel.basic_publish(exchange='', routing_key=self.targetq, body=json.dumps(msg))


        else:
            print("push all")
