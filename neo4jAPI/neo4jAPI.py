#from neo4jrestclient.client import GraphDatabase
def lambda_handler(event, context):

    return 'Hello from Lambda hahahahaha'

'''

def lambda_handler(event, context):
    gdb = GraphDatabase("http://hobby-aoggfappojekgbkeiookiiol.dbs.graphenedb.com:24789/db/data/",
                    username="USPNeo4j",
                    password="1ShigqV38xWETt45T2AG")
                    
    alice = gdb.nodes.create(name="Alice", age=30)
    return 'Hello from Lambda'
 '''
