import os
import requests

from pathlib import Path

class PDFLoader:

    def __init__(self, dir, **kwargs):
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

        multipart_form_data = {
            'file': open(file_path, 'rb')
        }

        response = requests.post('http://{apiBase}:{apiPort}{apiEndPoint}'.format(
            apiBase=os.environ.get("LOADER_API_BASE"),
            apiPort=os.environ.get("LOADER_API_PORT"),
            apiEndPoint=os.environ.get("LOADER_API_ENDPOINT")
        ),files=multipart_form_data)

        print(response.status_code)

