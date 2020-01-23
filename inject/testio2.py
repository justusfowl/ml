import socketio
import os

import datetime as dt
import pytz

from dotenv import load_dotenv
from os.path import join, dirname

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)


class PH:

    def __init__(self):
        sio = socketio.Client()

        @sio.event
        def connect():
            print('ProgressHandler | connection established')


        @sio.event
        def disconnect():
            print('ProgressHandler | disconnected from server')

        sio.connect("http://{sockethost}:{socketport}".format(
            sockethost="CL18",
            socketport=8000
        ))

        self.sio = sio

    def pub_to(self, obj_id, message, category="", details=None):
        message_obj = {
            "_id": obj_id,
            "message": message,
            "category": category,
            "datetime": str(dt.datetime.now(pytz.utc))
        }

        if details:
            message_obj["details"] = str(details)

        self.sio.emit('log', message_obj);

    def new_room(self, obj_id):
        self.sio.emit("newobj", obj_id)

ph = PH()

ph.new_room("1234")

@ph.sio.event
def objlog(message):
    print("from objlog")
    print(message)

@ph.sio.event
def log(message):
    print("LOG!!!!")
    print(message)

ph.sio.wait()
