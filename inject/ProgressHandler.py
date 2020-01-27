import socketio
import os

import datetime as dt
import pytz

from dotenv import load_dotenv
from os.path import join, dirname

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

class PH:

    def __init__(self, **kwargs):

        sio = socketio.Client()

        @sio.event
        def connect():
            print('ProgressHandler | connection established')

        @sio.event
        def disconnect():
            print('ProgressHandler | disconnected from server')

        if "host" in kwargs and "port" in kwargs:
            host = kwargs["host"]
            port = kwargs["port"]
        else:
            host = os.environ.get('SOCKET_HOST')
            port = os.environ.get('SOCKET_PORT')


        sio.connect("http://{sockethost}:{socketport}".format(
                sockethost=host,
                socketport=port
            ))

        self.sio = sio

    def pub_to(self, obj_id, message, category="", details=None, error=None):

        message_obj = {
            "_id" : obj_id,
            "message" : message,
            "category" : category,
            "datetime" : str(dt.datetime.now(pytz.utc))
        }

        if details:
            message_obj["details"] = details
        if error:
            message_obj["error"] = str(error)

        self.sio.emit('log', message_obj);

    def join_room(self, obj_id):
        self.sio.emit("newobj", obj_id)

    def leave_room(self, obj_id):
        self.sio.emit("leaveobj", obj_id)