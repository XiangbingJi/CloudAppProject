#!/bin/bash

lambda_fun="CustomerRelationshipLambda"

zip "$lambda_fun".zip -r "$lambda_fun".py

echo "Updating $lambda_fun ..."
aws lambda update-function-code \
    --function-name "$lambda_fun" \
    --zip-file fileb://"$lambda_fun".zip

exit 0
