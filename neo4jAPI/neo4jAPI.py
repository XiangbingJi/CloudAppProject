from neo4jrestclient.client import GraphDatabase
from neo4jrestclient import client


def getGDB():
    gdb = GraphDatabase("http://hobby-aoggfappojekgbkeiookiiol.dbs.graphenedb.com:24789/db/data/",
                    username="USPNeo4j",
                    password="1ShigqV38xWETt45T2AG")
    return gdb
                    

def lambda_handler(event, context):

    print "started, event is "
    print event
   

    if(event['operation'] == 'create'):
        try:
            if(event['type'] == 'node'):
                print "creating node"
                createNode(event['label'], event['UUID'], event['href'])
            elif(event['type'] == 'relationship'):
                createRelationship(event['relationship_type'], event['start_UUID'], event['end_UUID'])

            return {"status" : "success"}
        except Exception,e:
            print "exception happend"
            print e
            return {"status" : "fail"}
    elif(event['operation'] == 'get'):
        try:
            #there is some problem
            if(event['type'] == 'node'):
                data = getNode(event['label'], event['UUID'])

            return { "status" : "success",
                    "data" : data}
        except:
            return { "status" : "fail"}
    elif(event['operation'] == 'get_relationship_targets'):
        try:
            targets = getRelationshipTargets(event['own_UUID'], event['relationship_type'])
            return { "status" : "success", "data": targets}
        except:
            return {"status" : "fail"}

        



def getRelationshipTargets(startNodeUUID, relationshipType):
    gdb = getGDB()
    query = gdb.query(q = """match (n1 {{UUID:"{}"}}) - [rel:{}]-> (n) return distinct n""".format(startNodeUUID, relationshipType), returns=(client.Node))
    result = []
    for res in query:
        result.append({
            "UUID": res[0]['UUID'],
            "href": res[0]['href']
            })
    return result


def getNodeFromUUID(gdb, UUID):
    query = gdb.query(q="""match (n) where n.UUID="{}" return n""".format(UUID), returns=(client.Node))
    if(len(query) == 0):
        return None
    else:
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

    if not startNode or not endNode:
        print "ERROR: in creating relationship, one or both nodes does not exist"
        raise Exception("one or both nodes does not exist")

    startNode.relationships.create(relationshipType, endNode)
    return 




def getNode(label, UUID):

    gdb = getGDB()
    node = getNodeFromUUID(gdb, UUID)
    if not node:
        print "ERROR: getNode, node does not exist"
        raise Exception("getNode: node does not exist")

    #assume just one label per node
    nodeLabel = ""
    for label in node.labels:
        nodeLabel = label
        break


    returnValue = {
                "label" : nodeLabel._label,
                "UUID" : node['UUID'],
                "href" : node['href']
            }

    return  returnValue

