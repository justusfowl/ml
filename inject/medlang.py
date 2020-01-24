import time
import os
import spacy
from spacy.matcher import PhraseMatcher
from spacy.pipeline import EntityRuler
import uuid
import datetime as dt
import pytz

from elasticsearch import Elasticsearch
from dbal import DB
from bson.objectid import ObjectId

import pandas as pd
from ftfy import fix_text
from string_grouper import match_strings, match_most_similar, group_similar_strings, StringGrouper
import re

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

class NERItem:
    def __init__(self,
                 start_char,
                 end_char,
                 text,
                 NERTag,
                 score=99
                 ):

        self.start_char = start_char
        self.end_char = end_char
        self.value = text
        self.score = score
        self.tag = NERTag

    def _to_dict(self):

        return {
            "created_at": dt.datetime.now(pytz.utc),
            "end": self.end_char,
            "ent_id":  str(uuid.uuid1()),
            "start": self.start_char,
            "_id": str(self.tag["_id"]),
            "value": self.value,
            "score" : self.score
        }


class PreTagger:

    def __init__(self):

        self._init_nlp()

        self.lookup = pd.read_csv(os.environ.get("PRETAG_LOOKUP_TABLE_PATH"), sep=",", encoding = 'utf8', keep_default_na=False)

        self.lookup.set_index("search", inplace=True)

        self.db = DB()

        self.tag_cache = []

        self._init_phrase_matcher()


    def _init_nlp(self):
        print("Instantiating NER model...")
        self.nlp = spacy.load(os.environ.get("NER_MODEL_PATH")) # instead: spacy.blank('de') load blank model
        print("Instantiating NER model complete")

    def _init_phrase_matcher(self):

        self.shape_matcher = PhraseMatcher(self.nlp.vocab, attr="SHAPE")

        self.shape_matcher.add("DOSE", None, self.nlp("1-0-0"), self.nlp("1-1-1"), self.nlp("0-0-1"), self.nlp("0-0-1/1"), self.nlp("1-1-1 / 1"))

        self.shape_matcher.add("Date", None, self.nlp("23.09.1989"), self.nlp("23.09.89"), self.nlp("23. September 1989"),
                          self.nlp("23. September 89"),
                          self.nlp("10.04.1986"), self.nlp("10.04.86"), self.nlp("10. April 86"), self.nlp("10. April 1986"),
                          self.nlp("11.01.1984"), self.nlp("11.01.84"), self.nlp("11. Januar 84"), self.nlp("11. Januar 1984"), self.nlp("1. Januar 1984"),
                            self.nlp("1.12.1984"), self.nlp("8.10.2001"), self.nlp("12.2.1999"), self.nlp("1.1.2012"))

        self.shape_matcher.add("ICD", None, 
            self.nlp("B36.1G"), self.nlp("(B36.1G)"), self.nlp("{B36.1G}"), self.nlp("B36.1 G"), self.nlp("(B36.1 G)"), self.nlp("{B36.1 G}"),
            self.nlp("R06.0G"), self.nlp("(R06.0G)"), self.nlp("{R06.0G}"), self.nlp("R06.0 G"), self.nlp("(R06.0 G)"), self.nlp("{R06.0 G}"),
            self.nlp("I48.09G"), self.nlp("(I48.09G)"), self.nlp("{I48.09G}"), self.nlp("I48.09 G"), self.nlp("(I48.09 G)"), self.nlp("{I48.09 G}"),
            self.nlp("Z95.1Z"), self.nlp("(Z95.1Z)"), self.nlp("{Z95.1Z}"), self.nlp("Z95.1 Z"), self.nlp("(Z95.1 Z)"), self.nlp("{Z95.1 Z}"))

    def get_entities_from_text(self, intext):

        line_break_locs = self._find_all_occ_in_string(intext.lower(), "\n")

        string = intext.replace("\n", ' ')  # problems with processing '\n'

        doc = self.nlp(string)

        # STEP 1: NLP Model: get all entities + all pattern-/shape wise matches

        shape_matches = self.shape_matcher(doc)

        words_detected = []

        entities = []

        # process recognized entities PER and Negations
        for entity in doc.ents:
            if entity.label_ == 'PER' or entity.label_ == 'Negation':

                words_detected.append(self._clean_text(entity.text))

                ner_item = NERItem(
                    start_char=entity.start_char,
                    end_char=entity.end_char,
                    text=entity.text,
                    NERTag=self.get_tag(entity.label_)
                )

                entities.append(ner_item._to_dict())

        # process shape / pattern matches
        for m_id, start, end in shape_matches:
            entity = doc[start: end]
            words_detected.append(self._clean_text(entity.text))

            ner_item = NERItem(
                start_char=entity.start_char,
                end_char=entity.end_char,
                text=entity.text,
                NERTag=self.get_tag(self.nlp.vocab.strings[m_id])
            )

            entities.append(ner_item._to_dict())

        # STEP 2: get all tokens that are relevant within the input text (excluding stopwords + breaks + previously detected words)

        req_words = []

        for t in doc:
            if len(t.text) > 2 and t.text != "break" and not t.is_stop and not self._clean_text(t.text) in words_detected:
                req_words.append(t.text.lower())

        matches_raw = self._get_lookup_matches(req_words)

        fuz_matches = self._get_theme_for_lookup(matches_raw)

        for m in fuz_matches:
            term = m[0]
            score = m[2]
            label = m[3]
            all_start_idx = self._find_all_occ_in_string(string.lower(), term)

            for occ in all_start_idx:
                val = string[occ:occ + len(term)]

                ner_item = NERItem(
                    start_char=occ,
                    end_char=occ + len(term),
                    text=val,
                    NERTag=self.get_tag(label),
                    score=score
                )

                entities.append(ner_item._to_dict())

        # adjust for line breaks: since the ídx / locations of breaks have been collected up front,
        # no adjustment of the tags is necessary

        string = self._return_breaks(string, line_break_locs)

        entities = sorted(entities, key = lambda i: i["start"])

        final_entities = []
        skip_add_idx = []

        for i in range(len(entities)):
            if i not in skip_add_idx:
                if i + 1 < len(entities):

                    # make sure entities do not overlap
                    # as of now: take longer entitie detected
                    len_curr_ent = entities[i]["end"]-entities[i]["start"]
                    len_next_ent = entities[i+1]["end"]-entities[i+1]["start"]

                    # if the end idx of the current term is before the start of the next
                    # everything is OK -> add entity
                    if entities[i]["end"] <= entities[i + 1]["start"]:

                        # double check that the to-be-added entity does not conflict with previously added

                        if len(final_entities) > 0:
                            if final_entities[len(final_entities)-1]["end"] <= entities[i]["start"]:
                                final_entities.append(entities[i])
                        else:
                            final_entities.append(entities[i])

                    # otherwise: if the current entity is covering more text
                    # than the next one, add this current  entity and and skip the next one
                    # else: if it were to be shorter than the next one, do not add it - the next one will be added automatically
                    # in the next loop
                    else:
                        if len_curr_ent > len_next_ent:
                            final_entities.append(entities[i])
                            skip_add_idx.append(i+1)

                else:
                    final_entities.append(entities[i])

        return string, final_entities

    def _get_lookup_matches(self, requested_words):
        # Create a small set of artifical company names
        search = pd.Series(pd.Series(requested_words).unique())

        lookups = pd.Series(self.lookup["Word"].unique())

        # Create all matches:
        matches = match_strings(lookups, search, ngram_size=3, min_similarity=float(os.environ.get("LOOKUP_THRES_PRETAGGING")))

        return matches

    def _get_theme_for_lookup(self, matches):
        fuzzy_matches = []

        for w in matches.right_side.unique():
            term_most_sim = max(matches[matches.right_side == w].similarity)
            most_similar_word = matches[(matches.similarity == term_most_sim) & (matches.right_side == w)].left_side.iloc[0]
            fuzzy_matches.append((w, most_similar_word, term_most_sim, self._lookup_theme(most_similar_word)))

        return fuzzy_matches

    @staticmethod
    def _return_breaks(instring, break_idx):
        for b in break_idx:
            instring = instring[:b] + "\n" + instring[b + 1:]

        return instring

    @staticmethod
    def _clean_text(string):
        string = fix_text(string)  # fix text encoding issues
        string = string.encode("ascii", errors="ignore").decode()  # remove non ascii chars
        string = string.lower()  # make lower case
        chars_to_remove = [")", "(", "|", "[", "]", "{", "}", "'"]
        rx = '[' + re.escape(''.join(chars_to_remove)) + ']'
        string = re.sub(rx, '', string)  # remove the list of chars defined above
        string = string.title()  # normalise case - capital at start of each word
        string = re.sub(' +', ' ', string).strip()  # get rid of multiple spaces and replace with a single space
        return string

    @staticmethod
    def _find_all_occ_in_string(string, substring):
        """
        Function: Returning all the index of substring in a string
        Arguments: String and the search string
        Return:Returning a list
        """
        length = len(substring)
        c = 0
        indexes = []
        while c < len(string):
            if string[c:c + length] == substring:
                indexes.append(c)
            c = c + 1
        return indexes


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

    def _lookup_theme(self, in_text):
        try:
            lookup = self.lookup.loc[in_text.lower(),"Theme"]
            if isinstance(lookup, str):
                return lookup
            else:
                return lookup.values[0]
        except:
            return ""