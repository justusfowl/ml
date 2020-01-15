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


list_of_choices = [
    'service',
    'loader',
    'ocr',
    'spell',
    'pretag'
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
parser.add_argument('--flagdev', action='store_true',  help='Indicate OCR service to run in dev mode')


parser.add_argument('--fromdir', action='store_true',  help='Load files from a local directory')
parser.add_argument('--fromdb', action='store_true',  help='Load objects from the database into the workflow')
parser.add_argument('--targetq', action='store_true',  help='Define the target queue to where fromdb loaders load the objects into')

parser.add_argument("--objId", nargs='+',
                    help="Define the objectId that should be loaded form the mongoDb", metavar="STRINGS")

def main(args=sys.argv[1:]):
    args = parser.parse_args(args)

    if 'service' in args.routines:
        from API import initAPI
        print("WEB service started")
        app = initAPI()
        app.run(host=os.environ.get("API_HOST_IP"), port=os.environ.get("API_HOST_PORT"))

    elif 'ocr' in args.routines:
        from OCRProcessor import OCRProcessor

        print("OCR service started")
        if args.flagdev:
            ocr = OCRProcessor(dev=True)
            ocr.dev(objId="5deef3f92b1a6126a46ce805")
        else:
            ocr = OCRProcessor()
            ocr.init_consuming()


    elif 'pretag' in args.routines:
        from MedLangProcessor import MedLangProcessor

        print("Pretagging service started")
        if args.flagdev:
            pretagging = MedLangProcessor(dev=True)
            pretagging.dev(objId="5deef3f92b1a6126a46ce805")
        else:
            pretagging = MedLangProcessor()
            pretagging.init_consuming()

    elif 'spell' in args.routines:
        from SpellChecker import Speller

        speller = Speller(dev=True)
        speller.dev(objId="5de7aaf285363ed084394b1c")
        speller.store_obj()

    elif 'loader' in args.routines:
        from DocLoader import PDFLoader, ProcessLoader

        if args.fromdir:
            print("LOADER service started")

            directories = args.directories

            if len(directories) > 0:

                for d in directories:
                    logging.info("The following directory should be used {}".format(d))

                    myPDFLoader = PDFLoader(dir=d)

            else:
                logging.error("Please provide at least one directory to be monitored (-d/--directories)")
        elif args.fromdb:

            if not args.targetq:
                logging.error("No targetq provided, take OCR queue as default")
                targetq = os.environ.get("MQ_QUEUE_OCR")
            else:
                targetq = args.targetq

            if not args.objId:
                args.objId = None

            pl = ProcessLoader(targetq=targetq, objIds=args.objId)
            pl.load_obj()

        else:
            logging.error("Please provide what type of loader should be executed.")


    else:
        print("service")

main(sys.argv[1:])