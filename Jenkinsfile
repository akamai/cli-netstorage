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
    stage('Modify') {
      steps {
        sh 'bin/akamaiProperty modify jenkins.$BUILD_NUMBER.com --origin jenkins.origin.com'
        sh 'bin/akamaiProperty modify jenkins.$BUILD_NUMBER.com --origin origin.jenkins.com'
      }
    }
    stage('Retrieve') {
      steps {
        sh 'bin/akamaiProperty retrieve jenkins.$BUILD_NUMBER.com --file rules.json'
      }
    }
  }
}