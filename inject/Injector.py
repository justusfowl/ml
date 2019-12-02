# coding: utf-8
import os
from PIL import Image, ImageSequence
import glob
import datetime as dt
import pytz

from flask import Flask, flash, request, redirect, url_for

from dbal import DB

class PDFInjector:

    def __init__(self, file_path, **kwargs):

        self.IN_PATH = os.environ.get("IN_PATH")
        self.TIFF_PATH = os.environ.get("TIFF_PATH")
        self.OUT_PATH = os.environ.get("OUT_PATH")
        self.OUT_PATH_TXT = os.environ.get("OUT_PATH_TXT")

        self.file_path = file_path

        self.file_name = os.path.basename(self.file_path)

        self.pages = []

        self.db = DB()

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
                    "path" : thumb_path
                }

                self.pages.append(page)


    def to_dict(self):
        my_dict = {
            "fileName" : self.file_name,
            "filePath" : self.file_path_tiff,
            "pages" : self.pages
        }
        return my_dict

    def store_obj(self):

        obj = self.to_dict()
        obj["wfstatus"] = 0
        obj["wfstatus_change"] = [
            {
                "timeChange" : dt.datetime.now(pytz.utc),
                "wfstatus" : 0
            }
        ]

        self.db.mongo_db.labels.insert_one(obj)

