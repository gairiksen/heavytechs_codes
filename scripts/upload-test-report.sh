set -eu

UPLOAD_PATH=api/app_builder/marketplace_releases/sync

curl -sSf -XPUT $UPLOAD_HOST/$UPLOAD_PATH -H "Authorization: Token $MPKIT_TOKEN" \
  -F "marketplace_builder_file_body=@test-report.html" \
  -F "path=app/views/pages/$REPORT_PATH/index.liquid" \
  -o /dev/null

echo test report uploaded: $UPLOAD_HOST/$REPORT_PATH
