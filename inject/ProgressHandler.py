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
                sockethost=os.environ.get('SOCKET_HOST'),
                socketport=os.environ.get('SOCKET_PORT')
            ))

        self.sio = sio

    def pub_to(self, obj_id, message, category="", details=None):

        message_obj = {
            "_id" : obj_id,
            "message" : message,
            "category" : category,
            "datetime" : str(dt.datetime.now(pytz.utc))
        }

        if details:
            message_obj["details"] = str(details)

        self.sio.emit('log', message_obj);

    def new_room(self, obj_id):
        self.sio.emit(obj_id, "message")