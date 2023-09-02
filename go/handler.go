package main

import (
	"errors"
	"log"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
  lambda.Start(func () (*string, error) {
    log.Println("Hello, World!")
    log.Println("Another log")
    return nil, errors.New("This is an error")
  })
}
