fetch_test_result() {
  echo 'fetching test results'
  sleep 11
  curl -s ${MPKIT_URL}/api/app_builder/logs -H "Authorization: Token ${MPKIT_TOKEN}" -o app.log
  TEST_OUTPUT=`cat app.log`
  TEST_RESULT=`grep "${TEST_ID}" app.log`
}

start_test() {
  TEST_ID=$(curl -sf ${MPKIT_URL}/tests/run_async)
  TEST_ID=`echo $TEST_ID`
  echo triggered tests on ${MPKIT_URL/https:\/\//} - ID: ${TEST_ID}
}


start_test
fetch_test_result
counter=0
while [ -z "$TEST_RESULT" ]
do
  fetch_test_result

  counter=$((counter+1))
  if [ $counter -eq "30" ]
  then
    echo 'break - iam not waiting for tests any longer'
    break
  fi
done

set -eu

echo -ne $TEST_OUTPUT
grep -q "Success_${TEST_ID}" app.log
