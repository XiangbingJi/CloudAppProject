import boto3
import json
import random

client = boto3.client('lambda')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
resultTable = dynamodb.Table('Result')
resultKey = "default-customer-relationship-lambda-result-key"

def generateUUID():
    totalCharacters = 39 # length of number hash; in this case 0-39 = 40 characters
    txtUuid = ""
    while True:
        point = random.randint(0,9)
        if len(txtUuid) == 0 and point == 0:
            while True:
                point = random.randint(0,9)
                if point != 0: break
        txtUuid = txtUuid + str(point)
        if len(txtUuid) - 1 >= totalCharacters: break
    return txtUuid

class CustomerRelationshipError(Exception):
    def __init__(self, value):
        self.value = value
    def __str__(self):
        return repr(self.value)

def lambda_handler(event, context):

    try:
        event = json.loads(event['Records'][0]['Sns']['Message'])
        print event
        global resultKey
        resultKey = event['res_key']
        
        if(event['relationship'] == 'follow'):
            if(event['operation'] == 'create'):
                createFollowRelationship(event['own_email'],event['target_email'])
            elif(event['operation'] == 'get'):
                data = getFollowRelationshipTargets(event['own_email'])
                putResult(data)
        elif(event['relationship'] == 'like'):
            if(event['operation'] == 'create'):
                createLikeRelationship(event['own_email'], event['target_UUID'], event['target_type'])
            elif(event['operation'] == 'get'):
                data = getLikeRelationshipTargets(event['own_email'], event['target_type'])
                putResult(data)
        else:
            raise CustomerRelationshipError("400 Relationship not valid")
    except CustomerRelationshipError as e:
        putResult(e.value)
    except Exception as e:
        putResult(e.__str__())


def putResult(res):

    global resultKey
    print "wrinting result key={} , result = {}".format(resultKey, res)
    response = resultTable.put_item(
        Item={
            'key' : resultKey ,
            'result' : json.dumps(res)
        }
    )

def checkIDInCustomer(ID):
    payload = {
            "operation": "read",
            "tableName": "Customer",
            "email": ID,
            "res_key": generateUUID()
            }

    invokeLambda("Customer", payload)
    while True:
        resp = getPayload(invokeLambda("Result", {
            "tableName": "Result",
            "key": payload["res_key"]
        }))
        if "errorMessage" not in resp: break
    if "name" in resp and "Item is not found" in resp["name"]:
        raise ValueError("400 ID not found: {} ({})".format(ID, resp["name"]))

def checkIDInComment(ID):
    payload = {
            "operation": "read",
            "tableName": "Comment",
            "comment_id": ID
            }
    resp = getPayload(invokeLambda("Comment", payload))
    if "errorMessage" in resp:
        raise CustomerRelationshipError("400 ID not found: {} ({})".format(ID, resp["errorMessage"]))

def checkIDInContent(ID):
    payload = {
            "operation": "read",
            "tableName": "Content",
            "content_id": ID
            }
    resp = getPayload(invokeLambda("Content", payload))
    if "errorMessage" in resp:
        raise CustomerRelationshipError("400 ID not found: {} ({})".format(ID, resp["errorMessage"]))

def createFollowRelationship(ownUUID, targetUUID):
    checkIDInCustomer(ownUUID)
    checkExistOrCreateCustomerInGraph(ownUUID)
    checkIDInCustomer(targetUUID)
    checkExistOrCreateCustomerInGraph(targetUUID)

    addRelationship("follow", ownUUID, targetUUID)

    putResult("follow relationship from {} to {} created succssfully".format(ownUUID, targetUUID))


def createLikeRelationship(ownUUID, targetUUID, targetType):
    checkIDInCustomer(ownUUID)
    checkExistOrCreateCustomerInGraph(ownUUID)
    if(targetType == "comment"):
        checkIDInComment(targetUUID)
        checkExistOrCreateCommentInGraph(targetUUID)
    elif(targetType== "content"):
        checkIDInContent(targetUUID)
        checkExistOrCreateContentInGraph(targetUUID)
    else:
        raise CustomerRelationshipError("400 Invalid request, unknow target type for like relationship")

    addRelationship("like", ownUUID, targetUUID)
    putResult("like relationship from {} to {} created succssfully".format(ownUUID, targetUUID))

def getFollowRelationshipTargets(ownUUID):
    checkIDInCustomer(ownUUID)
    return getRelationshipTargets(ownUUID, 'follow', 'customer')

def getLikeRelationshipTargets(ownUUID, targetType):
    checkIDInCustomer(ownUUID)
    return getRelationshipTargets(ownUUID, 'like', targetType)


def getRelationshipTargets(UUID, relationshipType, targetType = None):
    if targetType:
        payload = {
                "operation" : "get_relationship_targets",
                "own_UUID" : UUID,
                "relationship_type" : relationshipType,
                "target_type": targetType
        }
    else:
        payload = {
                "operation" : "get_relationship_targets",
                "own_UUID" : UUID,
                "relationship_type" : relationshipType
        }

    response = invokeNeo4jLambda(payload)
    incomingPayload = getPayload(response)

    if incomingPayload['status'] == 'success':
        return incomingPayload['data']
    else:
        raise CustomerRelationshipError("404 Can not get relationship targets")


def checkExistOrCreateCustomerInGraph(UUID):
    payload = {
            "operation" : "get",
            "type" : "node",
            "label" : "customer",
            "UUID" : UUID,
            }
    
    response = invokeNeo4jLambda(payload)
    print response
    incomingPayload = getPayload(response)

    if(incomingPayload['status'] == 'fail'):
        createCustomer(UUID)


def checkExistOrCreateCommentInGraph(UUID):
    payload = {
            "operation" : "get",
            "type" : "node",
            "label" : "comment",
            "UUID" : UUID,
            }
    
    response = invokeNeo4jLambda(payload)
    incomingPayload = getPayload(response)

    if(incomingPayload['status'] == 'fail'):
        createComment(UUID)

def checkExistOrCreateContentInGraph(UUID):
    payload = {
            "operation" : "get",
            "type" : "node",
            "label" : "content",
            "UUID" : UUID,
            }
    
    response = invokeNeo4jLambda(payload)
    incomingPayload = getPayload(response)

    if(incomingPayload['status'] == 'fail'):
        createContent(UUID)


def getPayload(response):
    return json.loads(response['Payload'].read())

def invokeLambda(func, payload):
    print 'invoking ' + func + ' with payload:'
    print payload
    response = client.invoke(
        FunctionName =  func,
        Payload = json.dumps(payload)
    )
    print "result is "
    print response

    status = response['StatusCode']
    if status < 200 or status >299:
        raise CustomerRelationshipError("500 invoking lambda failed")

    return response

def invokeNeo4jLambda(payload):
    return invokeLambda('Neo4jAPI', payload)

def createCustomer(UUID):
    try:
        payload = {
                "operation" : "create",
                "type" : "node",
                "label" : "customer",
                "href" : UUID + "lalala",
                "UUID" : UUID
        }

        response = invokeNeo4jLambda(payload)
        incomingPayload = getPayload(response)
        if(incomingPayload['status'] != 'success'):
            raise CustomerRelationshipError("500 creating customer failed")
    except:
        raise CustomerRelationshipError("500 creating customer failed")

def createContent(UUID):
    try:
        payload = {
                "operation" : "create",
                "type" : "node",
                "label" : "content",
                "href" : UUID + "lalala",
                "UUID" : UUID
        }

        response = invokeNeo4jLambda(payload)
        incomingPayload = getPayload(response)
        if(incomingPayload['status'] != 'success'):
            raise CustomerRelationshipError("500 creating cotent failed")
    except:
        raise CustomerRelationshipError("500 creating content failed")

def createComment(UUID):
    try:
        payload = {
                "operation" : "create",
                "type" : "node",
                "label" : "comment",
                "href" : UUID + "lalala",
                "UUID" : UUID
        }

        response = invokeNeo4jLambda(payload)
        incomingPayload = getPayload(response)
        if(incomingPayload['status'] != 'success'):
            raise CustomerRelationshipError("500 creating comment failed")
    except:
        raise CustomerRelationshipError("500 creating comment failed")


def addRelationship(relationshipType, ownUUID, targetUUID):
    payload = { "operation" : "create",
            "type" : "relationship",
            "relationship_type" : relationshipType,
            "start_UUID" : ownUUID,
            "end_UUID" : targetUUID
    }

    response = invokeNeo4jLambda(payload)


