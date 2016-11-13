import boto3
import json
client = boto3.client('lambda')


def lambda_handler(event, context):
    print event
    if(event['relationship'] == 'follow'):
        if(event['operation'] == 'create'):
            createFollowRelationship(event['own_email'],event['target_email'])
        elif(event['operation'] == 'get'):
            data = getFollowRelationshipTargets(event['own_email'])
            return data
    elif(event['relationship'] == 'like'):
        if(event['operation'] == 'create'):
            createLikeRelationship(event['own_email'], event['target_UUID'], event['target_type'])
        elif(event['operation'] == 'get'):
            data = getLikeRelationshipTargets(event['own_email'], event['target_type'])
            return data


def checkIDInCustomer(ID):
    payload = {
            "operation": "read",
            "tableName": "Customer",
            "email": ID
            }
    resp = getPayload(invokeLambda("Customer", payload))
    if "errorMessage" in resp:
        raise ValueError("400 ID not found: {} ({})".format(ID, resp["errorMessage"]))

def checkIDInComment(ID):
    payload = {
            "operation": "read",
            "tableName": "Comment",
            "comment_id": ID
            }
    resp = getPayload(invokeLambda("Comment", payload))
    if "errorMessage" in resp:
        raise ValueError("400 ID not found: {} ({})".format(ID, resp["errorMessage"]))

def checkIDInContent(ID):
    payload = {
            "operation": "read",
            "tableName": "Content",
            "content_id": ID
            }
    resp = getPayload(invokeLambda("Content", payload))
    if "errorMessage" in resp:
        raise ValueError("400 ID not found: {} ({})".format(ID, resp["errorMessage"]))

def createFollowRelationship(ownUUID, targetUUID):
    checkIDInCustomer(ownUUID)
    checkExistOrCreateCustomerInGraph(ownUUID)
    checkIDInCustomer(targetUUID)
    checkExistOrCreateCustomerInGraph(targetUUID)

    addRelationship("follow", ownUUID, targetUUID)


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
        raise Exception("400 Invalid request")

    addRelationship("like", ownUUID, targetUUID)

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
        raise Exception("500 Can not get relationship targets")


def checkExistOrCreateCustomerInGraph(UUID):
    payload = {
            "operation" : "get",
            "type" : "node",
            "label" : "customer",
            "UUID" : UUID,
            }
    
    response = invokeNeo4jLambda(payload)
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
        raise Exception("500 invoking lambda failed")

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
            raise Exception("500 creating customer failed")
    except:
        raise Exception("500 creating customer failed")

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
            raise Exception("500 creating cotent failed")
    except:
        raise Exception("500 creating content failed")

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
            raise Exception("500 creating comment failed")
    except:
        raise Exception("500 creating comment failed")


def addRelationship(relationshipType, ownUUID, targetUUID):
    payload = { "operation" : "create",
            "type" : "relationship",
            "relationship_type" : relationshipType,
            "start_UUID" : ownUUID,
            "end_UUID" : targetUUID
    }

    response = invokeNeo4jLambda(payload)


