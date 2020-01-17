import socketio
import os

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

    def pub_to(self, obj_id, message):
        self.sio.emit('log', message);

    def new_room(self, obj_id):
        self.sio.emit(obj_id, "message")