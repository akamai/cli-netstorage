pipeline {
  agent any
  stages {
    stage('Initialize') {
      steps {
        sh 'npm install'
      }
    }
    stage('Create') {
      steps {
        sh 'bin/akamaiProperty create jenkins.$BUILD_NUMBER.com --clone jenkins.base.property'
      }
    }
    stage('Retrieve') {
      steps {
        sh 'bin/akamaiProperty retrieve jenkins.$BUILD_NUMBER.com --file rules.json'
      }
    }
  }
}