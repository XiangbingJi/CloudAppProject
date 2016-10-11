#!/bin/bash

if [ $# -eq 0 ]; then
    echo "$0 <lambda_function>"
    exit 1
fi

lambda_fun="$1"
lambda_file="$lambda_fun".js

if [ ! -f "$lambda_file" ]; then
    echo "File not found: $lambda_file"
    exit 2
fi

zip "$lambda_fun".zip "$lambda_file"

function function_exist() {
    aws lambda get-function --function-name "$1" &> /dev/null
    return $?
}

function_exist "$lambda_fun"
ret=$?

# 255 indicates not found
if [ $ret -eq 255 ]; then
    echo "Creating $lambda_fun ..."
    aws lambda create-function \
        --region us-east-1 \
        --function-name "$lambda_fun" \
        --zip-file fileb://"$lambda_fun".zip \
        --role arn:aws:iam::498679776130:role/lambda_basic_execution \
        --handler "$lambda_fun".handler \
        --runtime nodejs4.3 \
        --timeout 10 \
        --memory-size 512
else
    echo "Updating $lambda_fun ..."
    aws lambda update-function-code \
        --function-name "$lambda_fun" \
        --zip-file fileb://"$lambda_fun".zip
fi

exit 0
