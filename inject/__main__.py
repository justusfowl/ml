import sys
import argparse
import logging
import os
import warnings

file_dir = os.path.dirname(__file__)
sys.path.append(file_dir)

from dotenv import load_dotenv
from os.path import join, dirname

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

from DocLoader import PDFLoader
from OCRProcessor import  OCRProcessor


list_of_choices = [
    'service',
    'loader',
    'ocr'
]

parser = argparse.ArgumentParser(description='Medlines Labeling Service')

parser.add_argument(
    '-r',
    '--routines',
    required=True,
    nargs='+',
    choices=list_of_choices,
    metavar='R',
    help='List of routines to run: {}'.format(', '.join(list_of_choices))
)


parser.add_argument("-d", "--directories", nargs='+',
                    help="directories to be user for loader, works with --routines=loader", metavar="STRINGS")

parser.add_argument("-o", '--ocrdev', action='store_true',  help='Execute OCR as development env')


def main(args=sys.argv[1:]):
    args = parser.parse_args(args)

    if 'service' in args.routines:
        from API import initAPI
        print("WEB service started")
        app = initAPI()
        app.run(host=os.environ.get("API_HOST_IP"), port=os.environ.get("API_HOST_PORT"))

    elif 'ocr' in args.routines:
        print("OCR service started")
        if args.ocrdev:
            ocr = OCRProcessor(dev=True)
            ocr.dev(objId="5de50c60974a9c876da2c5d1")
        else:
            ocr = OCRProcessor()
            ocr.init_consuming()


    elif 'loader' in args.routines:
        print("LOADER service started")

        directories = args.directories

        if len(directories) > 0:

            for d in directories:
                logging.info("The following directory should be used {}".format(d))

                myPDFLoader = PDFLoader(dir=d)

        else:
            logging.error("Please provide at least one directory to be monitored (-d/--directories)")

    else:
        print("service")

main(sys.argv[1:])