import time
import os
from elasticsearch import Elasticsearch

class LangProcessor:

    def __init__(self, nlp, **kwargs):
        """

        :param nlp:
        :param kwargs:
        """

        self.es = Elasticsearch(
                [ os.environ.get("ELASTIC_HOST")],
                scheme=os.environ.get("ELASTIC_SCHEME"),
                port=os.environ.get("ELASTIC_POST"),
            )

        self.nlp = nlp

        self.INDEX_NAME =  os.environ.get("ELASTIC_INDEX")


        if "search_size" in kwargs and "search_size" is not None:
            self.SEARCH_SIZE = kwargs["search_size"]
        else:
            self.SEARCH_SIZE = 5


    def embed_text(self, text):
        collect_embed = []
        for test in self.nlp.pipe(text):
            collect_embed.append(test.vector)
        return [vector.tolist() for vector in collect_embed]

    def handle_query(self):
        query = input("Enter query: ")

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

        print()
        print("{} total hits.".format(response["hits"]["total"]["value"]))
        print("embedding time: {:.2f} ms".format(embedding_time * 1000))
        print("search time: {:.2f} ms".format(search_time * 1000))
        for hit in response["hits"]["hits"]:
            print("id: {}, score: {}".format(hit["_id"], hit["_score"]))
            print(hit["_source"])
            print()


        return response["hits"]["hits"]