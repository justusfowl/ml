# coding: utf-8
import os
from PIL import Image, ImageSequence
import glob
import datetime as dt
import pytz
import hashlib
import pika
import json
from flask import Flask, flash, request, redirect, url_for

from CVProcessing import CVProcessor

from dbal import DB

class PDFInjector:

    def __init__(self, file_path, **kwargs):

        self.TIFF_PATH = os.environ.get("TIFF_PATH")
        self.db = DB()
        self.cvProcessor = CVProcessor()

        self.file_path = file_path
        self.file_name = os.path.basename(self.file_path)

        self.pages = []
        self.exist_ids = []

        self._get_file_hash()

        self.flag_file_exists = False
        self.flagoverwrite = False

        if "flagoverwrite" in kwargs:
            if kwargs["flagoverwrite"]:
                print("Overwriting files with input...")
                self.flagoverwrite = True
            else:
                self.check_file_exists()
        else:
            self.check_file_exists()

        self.inserted_id = None

        self.connection = pika.BlockingConnection(self.db.mq_conn_params)
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=os.environ.get("MQ_QUEUE_OCR"), durable=True)


    def _get_file_hash(self):

        BLOCK_SIZE = 100000  # The size of each read from the file

        file_hash = hashlib.sha256()  # Create the hash object, can use something other than `.sha256()` if you wish
        with open(self.file_path, 'rb') as f:  # Open the file to read it's bytes
            fb = f.read(BLOCK_SIZE)  # Read from the file. Take in the amount declared above
            while len(fb) > 0:  # While there is still data being read from the file
                file_hash.update(fb)  # Update the hash
                fb = f.read(BLOCK_SIZE)  # Read the next block from the file

        this_file_hash = file_hash.hexdigest()

        self.file_hash = this_file_hash

    def check_file_exists(self):
        for item in self.db.mongo_db.labels.find({"fileHash": self.file_hash}):
            self.flag_file_exists = True
            self.exist_ids.append(item["_id"])

    def create_tiff(self):

        self.tiff_dir = os.path.join(self.TIFF_PATH, self.file_name)
        tiff_path = os.path.join(self.tiff_dir, self.file_name + ".tiff")

        self.file_path_tiff = tiff_path

        if not os.path.exists(self.tiff_dir):
            os.mkdir(self.tiff_dir)

        convert_cmd = 'convert -density 300 "%s" -quality 7 -depth 8 -normalize "%s"' % (self.file_path, tiff_path)

        conversion = os.system(convert_cmd)

    def create_thumbs(self):

        tiff_files = []
        for file in glob.glob(os.path.join(self.tiff_dir, "*.tiff")):

            tiff_files.append(file)

            im = Image.open(file)
            # im = im.convert("RGBX")

            # for i, page in enumerate(ImageSequence.Iterator(im)):
             #   page.save(file + "_" + str(i) + ".jpg", 'JPEG')

            for i in range(im.n_frames):
                im.seek(i)
                # img = img.convert("RGBX")
                out = im.convert("RGB")

                thumb_path = file + "_" + str(i) + ".jpg"

                out.save(thumb_path, 'JPEG')

                page = {
                    "idx" : i,
                    "width" : im.size[0],
                    "height" : im.size[1],
                    "path" : thumb_path
                }

                # get bounding box for text body based on predictive CV model
                bbox = self.cvProcessor.get_tbody(page)

                if bbox:
                    page["bbox"] = bbox

                self.pages.append(page)

    def to_dict(self):

        if not self.flag_file_exists:
            my_dict = {
                "fileName" : self.file_name,
                "fileHash" : self.file_hash,
                "filePathOrig" : self.file_path,
                "filePath" : self.file_path_tiff,
                "pages" : self.pages
            }

            if self.inserted_id is not None:
                my_dict["_id"] = self.inserted_id
        else:
            my_dict = {}

        return my_dict

    def store_obj(self):

        if not self.flag_file_exists:

            if self.flagoverwrite:
                self.db.mongo_db.labels.remove({"fileHash" : self.file_hash})

            obj = self.to_dict()

            obj["wfstatus"] = 1

            obj["wfstatus_change"] = [
                {
                    "timeChange": dt.datetime.now(pytz.utc),
                    "wfstatus": 0
                },
                {
                    "timeChange": dt.datetime.now(pytz.utc),
                    "wfstatus": 1
                }
            ]

            _id =  self.db.mongo_db.labels.insert_one(obj)

            self.inserted_id = str(_id.inserted_id)

        else:
            print("File %s cannot be added, as it already exists..." % self.file_name)

    def publish_to_OCR(self):
        if self.inserted_id is not None:
            msg = {"_id": self.inserted_id}
            self.channel.basic_publish(exchange='', routing_key=os.environ.get("MQ_QUEUE_OCR"), body=json.dumps(msg))