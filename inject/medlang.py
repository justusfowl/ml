import time
import os
import spacy
from spacy.pipeline import EntityRuler
import uuid
import datetime as dt
import pytz

from elasticsearch import Elasticsearch
from dbal import DB
from bson.objectid import ObjectId


class LangProcessor:

    def __init__(self, nlp, **kwargs):
        """

        :param nlp: nlp object from spacy including the model
        :param kwargs: diverse parameters
        """

        self.es = Elasticsearch(
                [ os.environ.get("ELASTIC_HOST")],
                scheme=os.environ.get("ELASTIC_SCHEME"),
                port=os.environ.get("ELASTIC_POST"),
            )

        self.nlp = nlp

        self.INDEX_NAME =  os.environ.get("ELASTIC_INDEX")


        if "search_size" in kwargs and kwargs["search_size"] is not None:
            self.SEARCH_SIZE = kwargs["search_size"]
        else:
            self.SEARCH_SIZE = 5


    def embed_text(self, text):
        collect_embed = []
        for test in self.nlp.pipe(text):
            collect_embed.append(test.vector)
        return [vector.tolist() for vector in collect_embed]

    def handle_query(self, query):

        embedding_start = time.time()
        query_vector = self.embed_text([query])[0]
        embedding_time = time.time() - embedding_start

        script_query = {
            "script_score": {
                "query": {"match_all": {}},
                "script": {
                    "source": "cosineSimilarity(params.query_vector, doc['title_vector']) + 1.0",
                    "params": {"query_vector": query_vector}
                }
            }
        }

        search_start = time.time()

        response = self.es.search(
            index=self.INDEX_NAME,
            body={
                "size": self.SEARCH_SIZE,
                "query": script_query,
                "_source": {"includes": ["title", "case_text"]}
            }
        )
        search_time = time.time() - search_start

<<<<<<< HEAD
        return response["hits"]["hits"], (embedding_time * 1000), (search_time * 1000)


class NERTag:

    def __init__(self, label):
        self.label = label
        self.db = DB()

        self.tag = self.get_db_tag()

    def get_db_tag(self):

        tag = self.db.mongo_client.medlabels.metalabels.find_one({"value": self.label})

        if tag:
            return tag
        else:
            return self.make_new_db_tag()

    def make_new_db_tag(self):
        #@TODO: Make sure to make shortcut unique!

        res = self.db.mongo_client.medlabels.metalabels.insert_one({"value": self.label, "shortcut": self.label[:1].upper()})
        tag = self.db.mongo_client.medlabels.metalabels.find_one({"_id": ObjectId(res.inserted_id)})

        return tag

class PreTagger:

    def __init__(self):
        print("Instantiating NER model...")
        self.nlp = spacy.load(os.environ.get("NER_MODEL_PATH"))
        print("Instantiating NER model complete")
        self.ruler = EntityRuler(self.nlp)
        self.db = DB()

        self.tag_cache = []

    def get_entities_from_text(self, intext):

        doc = self.nlp(intext)
        entities = []

        for ent in doc.ents:
            entities.append(self.get_entity(ent))

        return entities

    def get_tag(self, value):

        for x in self.tag_cache:
            if x["value"] == value:
                break
        else:
            x = NERTag(value).tag
            self.tag_cache.append(x)

        return x

    def get_entity(self, entity_item):

        tag = self.get_tag(entity_item.label_)

        t = {
            "created_at":dt.datetime.now(pytz.utc),
            "end": entity_item.end_char,
            "ent_id":  str(uuid.uuid1()),
            "start": entity_item.start_char,
            "_id": str(tag["_id"]),
            "value": entity_item.text
        }

        return t
=======
        return response["hits"]["hits"], (embedding_time * 1000), (search_time * 1000)
>>>>>>> 58d9d6bf7d8a3d4dc8b7245091cb0c44b80ff112
