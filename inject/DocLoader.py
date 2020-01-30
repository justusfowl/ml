import os
import requests
import pika
import json
import img2pdf, sys, os, time
from pathlib import Path
from dbal import DB
from bson.objectid import ObjectId

class PDFLoader:

    def __init__(self, dir, **kwargs):

        self.db = DB()

        self.dir = dir

        self.files = []

        self.load_files()

        # self.process_files()

    def load_files(self):
        for filename in Path(self.dir).rglob('*.pdf'):
            self.files.append(filename)

    def process_files(self, **kwargs):
        for f in self.files:
            self.post_file(f, **kwargs)

    def post_file(self, file_path, **kwargs):

        print("Posting file... %s" % file_path)

        multipart_form_data = {
            'file': open(file_path, 'rb')
        }

        body = {}

        for key, value in kwargs.items():
            body[key] = value

        response = requests.post('http://{apiBase}:{apiPort}{apiEndPoint}'.format(
            apiBase=os.environ.get("LOADER_API_BASE"),
            apiPort=os.environ.get("LOADER_API_PORT"),
            apiEndPoint=os.environ.get("LOADER_API_ENDPOINT")
        ),files=multipart_form_data, data=body)

        print("Result for %s ends with %s" % (file_path, response.status_code))


class PatLoader():

    def __init__(self, dir, **kwargs):
        self.dir = dir

        if "wfsteps" in kwargs:
            self.wfsteps = kwargs["wfsteps"]
        else:
            self.wfsteps = []

    def process_pats(self):

        PAT_DATA_BASE_DIR = self.dir

        for pats in os.listdir(PAT_DATA_BASE_DIR):

            patDirs = os.path.join(PAT_DATA_BASE_DIR, pats)

            pat_nummer = pats[:pats.find("@")]
            pat_name = pats[pats.find("@") + 1:]

            for patDir in os.listdir(patDirs):

                if 'Briefe' in patDir:
                    letterDirs = os.path.join(patDirs, patDir)

                    for letterDir in os.listdir(letterDirs):

                        # Convert the TIFFs into PDFs

                        letter_images = []

                        letterItemPath = os.path.join(letterDirs, letterDir)

                        try:
                            for f in os.listdir(letterItemPath):
                                # print(os.path.join(letterItemPath,f))

                                if f.lower().endswith(".tif") or f.lower().endswith(".tiff"):
                                    letter_images.append(os.path.join(letterItemPath, f))

                            # create pdf from the letter TIFFs
                            if len(letter_images) > 0:
                                outputfile = os.path.join(letterItemPath, Path(os.path.basename(letter_images[0])).stem + ".pdf")
                                pdf_bytes = img2pdf.convert(letter_images)
                                file = open(outputfile, "wb")
                                file.write(pdf_bytes)

                        except Exception as e:
                            print("Something went wrong with files in dir %s " % letterItemPath)


                    pdfLoader = PDFLoader(dir=letterDirs)
                    pdfLoader.process_files(pat_nummer=pat_nummer, pat_name=pat_name, wfsteps=self.wfsteps)

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

        if "wfsteps" in kwargs:
            self.wfsteps = kwargs["wfsteps"]
        else:
            self.wfsteps = []

        self.connection = pika.BlockingConnection(self.db.mq_conn_params)
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=self.targetq, durable=True)
        # self.channel.basic_qos(prefetch_count=1)

    def load_obj(self):

        if len(self.objIds) > 0:

            for id in self.objIds:

                # self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(self.objId)})

                # self.channel.basic_consume(on_message_callback=self.callback, queue='medlines')

                msg = {"_id" : id, "wfsteps" : self.wfsteps}

                self.channel.basic_publish(exchange='', routing_key=self.targetq, body=json.dumps(msg))


        else:
            print("push all")
