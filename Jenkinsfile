pipeline {
    agent any
    stages {
        stage('Deploy BE') {
            steps {
                withCredentials([string(credentialsId: 'render-be-hook', variable: 'BE_HOOK')]) {
                    sh 'curl -X POST "$BE_HOOK"'
                }
            }
        }
        stage('Deploy FE') {
            steps {
                withCredentials([string(credentialsId: 'render-fe-hook', variable: 'FE_HOOK')]) {
                    sh 'curl -X POST "$FE_HOOK"'
                }
            }
        }
    }
}