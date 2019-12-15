from datetime import datetime
from elasticsearch import Elasticsearch

client = Elasticsearch(
    ['192.0.0.119'],
    scheme="http",
    port=9200,
)

query = input("Enter query: ")

script_query = {
    "script_score": {
        "query": {"match_all": {}}
    }
}

response = client.search(
    index="posts",
    body={
        "size": 5,
        "query": script_query,
        "_source": {"includes": ["title", "case_text"]}
    }
)

print()
print("{} total hits.".format(response["hits"]["total"]["value"]))

for hit in response["hits"]["hits"]:
    print("id: {}, score: {}".format(hit["_id"], hit["_score"]))
    print(hit["_source"])
    print()
