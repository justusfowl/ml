import os
from flask import Flask, flash, request, redirect, url_for, jsonify, make_response
from werkzeug.utils import secure_filename
import spacy
import darknetWrap as dn

from Injector import PDFInjector
from medlang import LangProcessor, PreTagger
from SpellChecker import Speller
from ProgressHandler import PH

net, meta, names = dn.getNetInit(
    configPath=os.environ.get("DARKNET_CFG_PATH"),
    weightPath=os.environ.get("DARKNET_WEIGHTS_PATH"),
    metaPath=os.environ.get("DARKNET_DATA_PATH")
)

# nlp = spacy.load('de_trf_bertbasecased_lg')

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}

nerTagger = PreTagger()

spellChecker = Speller()

def initAPI():

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER")

    app = Flask(__name__)
    app.secret_key = os.environ.get("API_SECRET")
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    def allowed_file(filename):
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    def get_file_ext(filename):
        return filename.rsplit('.', 1)[1].lower()

    @app.route('/hb', methods=['get'])
    def hb():
        data = {'message': 'OK', 'code': 'SUCCESS'}
        return make_response(jsonify(data), 201)

    @app.route('/file/pdf', methods=['POST'])
    def upload_file():
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)

        file = request.files['file']
        flag_over_write = False

        if request.args.get('flagoverwrite') is not None:
            flag_over_write = True

        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)

            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            file.save(file_path)

            f_ext = get_file_ext(file_path)

            data = {}

            if (f_ext == "pdf"):

                pdf_obj = PDFInjector(file_path=file_path, flagoverwrite=flag_over_write)

                pdf_obj.create_tiff()
                pdf_obj.create_thumbs()
                pdf_obj.store_obj()
                pdf_obj.publish_to_OCR()

                res_dict = pdf_obj.to_dict()

                if pdf_obj.flag_file_exists:
                    data = {'message': 'skipped', 'code': 'SUCCESS',
                            'hasExisted': (pdf_obj.flag_file_exists)}
                else:
                    data = {'message': 'Created', 'code': 'SUCCESS', 'dict': res_dict,
                            'hasExisted': (pdf_obj.flag_file_exists)}

            return make_response(jsonify(data), 201)

    @app.route('/analytics/tbody', methods=['POST'])
    def process_tbody_file():
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)

        file = request.files['file']

        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)

        print("Analytics Bbox: %s" % file.filename)

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)

            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            file.save(file_path)

            f_ext = get_file_ext(file_path)

            data = {}

            if (f_ext == "pdf"):

                pdf_obj = PDFInjector(file_path=file_path, flagoverwrite=True)
                pdf_obj.create_tiff()
                pdf_obj.create_thumbs()

                for p in pdf_obj.pages:
                    darklnet_detect = dn.performDetect(imagePath=p["path"], net=net, meta=meta, names=names)
                    p["detections"] = darklnet_detect

                data = pdf_obj.to_dict()

            return make_response(jsonify(data), 201)

    @app.route('/analytics/tner', methods=['POST'])
    def process_tner_str():
        # check if the post request has the file part
        try:
            body = request.get_json(force=True)
        except :
            flash('No body sent')
            return redirect(request.url)

        print("Analytics NER demo called")

        if "text" in body:

            corrected_text = spellChecker.check_string(body["text"])

            if not body["text"] == corrected_text:
                body["corrected"] = True
                body["text_raw"] = body["text"]
                body["text"] = corrected_text
            else:
                body["corrected"] = False

            body["text"], body["entities"], body["details"] = nerTagger.get_entities_from_text(body["text"])

        return make_response(jsonify(body), 201)

    @app.route('/medlang/search', methods=["GET"])
    def search():
        q = request.args.get('q')

        if q is None or q == "":
            return make_response(jsonify({}), 201)

        size = request.args.get('size')

        # medLangProc = LangProcessor(nlp=nlp, search_size=size)

        search_result, embed_time, search_time = "", "", []  # medLangProc.handle_query(q)

        data = {
            "search_result" : search_result,
            "embed_time": embed_time,
            "search_time": search_time
        }

        return make_response(jsonify(data), 201)

    return app