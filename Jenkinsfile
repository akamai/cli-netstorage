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
  }
}