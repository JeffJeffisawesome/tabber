#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$(dirname "$DIR")"

echo "=== Building Scraper Lambda ==="
cd "$ROOT_DIR"
npm run build

FUNCTION_NAME="tabber-scraper-service"
REGION="${AWS_REGION:-us-east-1}"

echo "=== Deploying to AWS Lambda ($FUNCTION_NAME in $REGION) ==="

if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed or not in PATH."
    exit 1
fi

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "Updating existing Lambda function code..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://dist/function.zip \
        --region "$REGION"
    
    echo "Updating function configuration (1024MB RAM, 15s timeout)..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --memory-size 1024 \
        --timeout 15 \
        --region "$REGION" >/dev/null
else
    echo "Function does not exist yet. Please use AWS SAM ('sam deploy --guided') or create it via AWS Console."
    echo "ZIP artifact ready at: $ROOT_DIR/dist/function.zip"
    exit 0
fi

FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" --query "FunctionUrl" --output text 2>/dev/null || true)

if [ -n "$FUNCTION_URL" ] && [ "$FUNCTION_URL" != "None" ]; then
    echo "=========================================================="
    echo "🚀 Lambda Function URL: $FUNCTION_URL"
    echo "Set this in frontend/.env:"
    echo "VITE_API_URL=$FUNCTION_URL"
    echo "=========================================================="
fi
