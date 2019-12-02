import os
import pymongo
import pika

class DB:

    def __init__(self):

        mongo_conn_string = "mongodb://{user}:{passwd}@{host}:{port}/{db_name}".format(
            user=os.environ.get('MONGO_DB_USER'),
            passwd=os.environ.get('MONGO_DB_PASS'),
            host=os.environ.get('MONGO_DB_HOST'),
            port=os.environ.get('MONGO_DB_PORT'),
            db_name=os.environ.get('MONGO_DB_DB')
        )


        self.mongo_client = pymongo.MongoClient(mongo_conn_string)
        self.mongo_db = self.mongo_client.medlabels

        credentials = pika.PlainCredentials(os.environ.get('MQ_USER'), os.environ.get('MQ_PASSWORD'))
        parameters = pika.ConnectionParameters(host=os.environ.get('MQ_HOST'),
                                               port=os.environ.get('MQ_PORT'),
                                               virtual_host='/',
                                               credentials=credentials, heartbeat=0, blocked_connection_timeout=300)

        self.mq_conn_params = parameters
