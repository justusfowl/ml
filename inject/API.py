import os
from flask import Flask, flash, request, redirect, url_for, jsonify, make_response
from werkzeug.utils import secure_filename

from util import md5
from Injector import PDFInjector

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}

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

            if (f_ext == "pdf"):
                pdf_obj = PDFInjector(file_path=file_path)
                pdf_obj.create_tiff()
                pdf_obj.create_thumbs()
                pdf_obj.store_obj()

                res_dict = pdf_obj.to_dict()

            data = {'message': 'Created', 'code': 'SUCCESS', 'dict' : res_dict}
            return make_response(jsonify(data), 201)

    return app