#!/bin/bash

if [ $# -eq 0 ]; then
    echo "$0 <lambda_function> [event_file] [output_file]"
    exit 1
fi

lambda_fun="$1"
[[ "$2" == "" ]] && event_file="event.json" || event_file="$2"
[[ "$3" == "" ]] && output_file="out.txt" || output_file="$3"

if [ ! -f "$event_file" ]; then
    echo "File not found: $event_file"
    exit 2
fi

aws lambda invoke \
    --function-name "$lambda_fun" \
    --region us-east-1 \
    --payload file://"$event_file" \
    "$output_file"
