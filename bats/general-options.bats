@test "Bare bin/akamaiProperty shows usage" {
   run bin/akamaiProperty
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}
@test "Akamai subcommands show usage" {
   run bin/akamaiProperty modify
   [ $status -eq 1 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}

@test "Akamai subcommands work with pre help" {
   run bin/akamaiProperty help modify
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}

@test "Akamai subcommands work with help flag (--help)" {
   run bin/akamaiProperty modify --help
   [ $status -eq 0 ]
   [ $(expr "${lines[0]}" : "Usage:") -ne 0 ]
   [ "${#lines[@]}" -gt 10 ]
   [ $(expr "$output" : ".*config.*") -ne 0 ]
   [ $(expr "$output" : ".*section.*") -ne 0 ]
}

@test "Create a new test property $PROPERTYNAME" {
  run bin/akamaiProperty create $PROPERTYNAME --clone akamaiapibootcamp.com
  echo "status = ${status}"
  echo "output = ${output}"
  [ $status -eq 0 ]
}

@test "Delete test property $PROPERTYNAME" {
  run bin/akamaiProperty delete $PROPERTYNAME
  echo "status = ${status}"
  echo "output = ${output}"
  [ $status -eq 0 ]
}

