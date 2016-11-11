from neo4jrestclient.client import GraphDatabase
from neo4jrestclient import client


def getGDB():
    gdb = GraphDatabase("http://hobby-aoggfappojekgbkeiookiiol.dbs.graphenedb.com:24789/db/data/",
                    username="USPNeo4j",
                    password="1ShigqV38xWETt45T2AG")
    return gdb
                    

def lambda_handler(event, context):
    

    if(event['operation'] == 'create'):
        try:
            if(event['type'] == 'node'):
                createNode(event['label'], event['UUID'], event['href'])
            elif(event['type'] == 'relationship'):
                createRelationship(event['relationship_type'], event['start_UUID'], event['end_UUID'])
                return {"status" : "success"}
        except:
            return {"status" : "fail"}
    elif(event['operation'] == 'get'):
        try:
            if(event['type'] == 'node'):
                data = getNode(event['label'], event['UUID'])

            return { "status" : "success",
                    "data" : data}
        except:
            return { "status" : "fail"}


def getNodeFromUUID(gdb, UUID):
    query = gdb.query(q="""match (n) where n.UUID="{}" return n""".format(UUID), returns=(client.Node))
    return query[0][0]

def createNode(label, UUID, href):
            
    gdb = getGDB()                   
    newNode = gdb.nodes.create(name=UUID, UUID=UUID, href=href)
    newNode.labels.add(label)
    return newNode

def createRelationship(relationshipType, startUUID, endUUID):

    gdb = getGDB()

    startNode = getNodeFromUUID(gdb, startUUID)
    endNode = getNodeFromUUID(gdb, endUUID)
    startNode.relationships.create(relationshipType, endNode)
    return 




def getNode(label, UUID):

    gdb = getGDB()
    node = getNodeFromUUID(gdb, UUID)
    nodeLabel = ""
    for label in node.labels:
        nodeLabel = label
        break


    returnValue = {
                "label" : nodeLabel._label,
                "UUID" : node['UUID'],
                "href" : node['href']
            }

    print returnValue
    return  returnValue

