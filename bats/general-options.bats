@test "Bare bin/akamaiNetStorage shows usage" {
   run bin/akamaiNetStorage
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}
@test "Akamai subcommands work with pre help" {
   run bin/akamaiNetStorage help modify
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}

@test "Akamai subcommands work with help flag (--help)" {
   run bin/akamaiNetStorage modify --help
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}

@test "Create a new test property $PROPERTYNAME" {
  run bin/akamaiNetStorage dir
  echo "status = ${status}"
  echo "output = ${output}"
  [ $status -eq 0 ]
}

