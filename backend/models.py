import os
from pymongo import MongoClient

_client = None

def get_db():
    global _client
    if _client is None:
        uri = os.environ.get('MONGODB_URI')
        if not uri:
            print("WARNING: MONGODB_URI not set!")
            uri = "mongodb://localhost:27017/siwes"
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        return _client.get_default_database()
    except Exception:
        return _client['siwes']
