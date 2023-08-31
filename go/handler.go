package main

import (
	"log"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
  lambda.Start(func () (string, error) {
    log.Println("Hello, World!")
    log.Println("Another log")
    return "Hello, World!", nil
  })
}
