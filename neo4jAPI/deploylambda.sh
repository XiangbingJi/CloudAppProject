#!/bin/bash

lambda_fun="Neo4jAPI"

zip "$lambda_fun".zip -r neo4jAPI.py neo4jrestclient requests

echo "Updating $lambda_fun ..."
aws lambda update-function-code \
    --function-name "$lambda_fun" \
    --zip-file fileb://"$lambda_fun".zip

exit 0
