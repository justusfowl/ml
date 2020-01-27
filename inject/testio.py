import socketio
import os

import datetime as dt
import pytz

from dotenv import load_dotenv
from os.path import join, dirname

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

from ProgressHandler import PH

ph = PH(host="CL18", port=8000)

_id = input("Enter ID: ")

ph.join_room(_id)

def run(p):
    while True:
        try:
            try:
                msg = input("Enter query: ")
                if msg == "start" :

                    p.pub_to(_id, msg, details={"start" : True})
                elif msg == "complete" :
                    p.pub_to(_id, msg, details={"complete": True})

                else:
                    p.pub_to(_id, msg)

            except Exception as e:

                p.pub_to(_id, msg, error=e)

        except KeyboardInterrupt:
            return

run(ph)