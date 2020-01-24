# -*- coding: utf-8 -*-
"""
Created on Sun Oct 27 18:13:44 2019

@author: mschwaerzler
"""
import logging
from fuzzysearch import find_near_matches
import pandas as pd
from symspellpy import SymSpell, Verbosity
from bson.objectid import ObjectId
from dbal import DB



class Speller:

    def __init__(self, **kwargs):

        if 'dev' in kwargs:

            print("Spellchecker run in development mode...small sample of checking items loaded only")
            self.flagDev = True

            self.abkuerzung_path = "inject/Abkuerzungen.csv"
            self.word_freq_path = "inject/word_freq_test.txt"

        else:

            self.abkuerzung_path = "inject/Abkuerzungen.csv"
            self.word_freq_path = "inject/word_freq_list_overall.txt"

        print("Initializing spellchecker...")
        self.loadAbbreviations()
        self.loadSymSpell()
        print("Initializing spellchecker complete")

    def loadSymSpell(self):
        self.sym_spell = SymSpell()
        self.sym_spell.load_dictionary(self.word_freq_path, 0, 1, encoding="utf8")

    def loadAbbreviations(self):
        self.Abkuerzungen = pd.read_csv(self.abkuerzung_path, sep=";", header=0, encoding="latin-1")
        self.Abkuerzungen['lower_case'] = [str(x).lower().strip(".") for x in list(self.Abkuerzungen['Abkuerzung'])]
        self.Abkuerzungen = self.Abkuerzungen.dropna()
        self.Abkuerzungen = self.Abkuerzungen.reset_index()

    def dev(self, objId):
        self.db = DB()
        self.objId = objId
        self.process_obj(self.objId)


    def process_obj(self, obj):

        self.label_obj = self.db.mongo_db.labels.find_one({"_id": ObjectId(self.objId)})

        for p in self.label_obj["pages"]:
            if "read_text_raw" in p:
                s = p["read_text_raw"]
                c_s = self.check_string(s)
                p["read_text"] = c_s

    def store_obj(self):
        self.db.mongo_db.labels.update({"_id": ObjectId(self.objId)}, self.label_obj)

    def get_store_obj(self):
        return self.label_obj

    def check_string(self, in_string):
        # spell correction
        string_corr = []
        string = in_string.replace("\n", ' break ')  # problems with processing '\n'
        for word in string.split(' '):  # process word by word since the compound version deletes any special characters
            word = word.strip('\r\n')
            if (word == "AUF") | (word == "AU"):
                word = 'Arbeitsunfähigkeit'
            if (word == "P:"):
                word = 'Patient:'
            if word not in ('', ',', '!', '.', ';', ':', '?', '-', '') and word.lower().strip(".,") not in list(
                    self.Abkuerzungen['lower_case']):
                input_term = word
                if input_term[-1] in ("?", "!", ".", ",", ":", ";"):
                    input_term = input_term[:-1]
                # max edit distance per lookup (per single word, not per whole input string)
                suggestions = self.sym_spell.lookup(input_term, Verbosity.CLOSEST,
                                               max_edit_distance=2, transfer_casing=True, ignore_token=r".*[()].*",
                                               include_unknown=True)  # display suggestion term, edit distance, and term frequency

                if word[-1] in ("?", "!", ".", ",", ":", ";"):
                    suggestion = str(suggestions[0].term) + word[-1]
                else:
                    suggestion = str(suggestions[0].term)
                if input_term.lower() == str(suggestions[0].term):
                    string_corr = string_corr + [str(word)]
                else:
                    string_corr = string_corr + [suggestion]
            if word.lower().strip(".,:") in list(self.Abkuerzungen['lower_case']):
                string_corr = string_corr + [
                    self.Abkuerzungen['narrativ'][list(self.Abkuerzungen['lower_case']).index(word.lower().strip(".,:"))]]
        string_corr = ' '.join(string_corr)

        string_corr = string_corr.replace("break", '\n')

        return string_corr


