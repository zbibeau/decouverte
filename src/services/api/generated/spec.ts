export default {
  "openapi": "3.0.3",
  "info": {
    "title": "API PRO",
    "version": "1.0.0",
    "contact": {}
  },
  "paths": {
    "/contacts": {
      "get": {
        "tags": [
          "Hubspot"
        ],
        "summary": "Get Contact Information",
        "description": "Get Contact Information",
        "operationId": "getContactInformation",
        "parameters": [
          {
            "name": "utk",
            "in": "query",
            "schema": {
              "type": "string",
              "example": "f4b936693064c2c6ebf04bfb73e2bc22"
            }
          },
          {
            "name": "email",
            "in": "query",
            "schema": {
              "type": "string",
              "example": "quentin%2Bdemo-test%40madeformed.com"
            },
            "description": "EMAIL URL ENCODED"
          }
        ],
        "responses": {
          "200": {
            "description": "Valid",
            "headers": {
              "Access-Control-Allow-Origin": {
                "schema": {
                  "type": "string",
                  "example": "*"
                }
              },
              "Alt-Svc": {
                "schema": {
                  "type": "string",
                  "example": "h3=\":443\"; ma=2592000"
                }
              },
              "Content-Length": {
                "schema": {
                  "type": "string",
                  "example": "410"
                }
              },
              "Content-Security-Policy": {
                "schema": {
                  "type": "string",
                  "example": "default-src 'self' https: ;                                                         style-src 'self' https: http: ;                                                         script-src 'self' 'unsafe-inline' 'unsafe-eval' ;                                                         font-src 'self' https: http: ;                                                         media-scr 'self' blob: data: https: http: ;                                                         image-src 'self'  http: https: data: blob: ;                                                         connect-src 'self' https: ;"
                }
              },
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Wed, 17 Jan 2024 08:27:49 GMT"
                }
              },
              "Permissions-Policy": {
                "schema": {
                  "type": "string",
                  "example": "interest-cohort=()"
                }
              },
              "Referrer-Policy": {
                "schema": {
                  "type": "string",
                  "example": "strict-origin-when-cross-origin"
                }
              },
              "Strict-Transport-Security": {
                "schema": {
                  "type": "string",
                  "example": "max-age=31536000;"
                }
              },
              "X-Content-Type-Options": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "X-Powered-By": {
                "schema": {
                  "type": "string",
                  "example": "PHP/7.2.34"
                }
              },
              "X-Xss-Protection": {
                "schema": {
                  "type": "string",
                  "example": "1; mode=block"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "contact": {
                      "type": "object",
                      "properties": {
                        "poste": {
                          "type": "string",
                          "example": "Médecin généraliste"
                        },
                        "medecin_de_suivi__": {
                          "type": "boolean",
                          "example": true
                        },
                        "mode_d_installation": {
                          "type": "string",
                          "example": "Seul"
                        },
                        "nouveaux_patients__": {
                          "type": "boolean",
                          "example": true
                        },
                        "vad__": {
                          "type": "boolean",
                          "example": true
                        },
                        "current_solution": {
                          "type": "string",
                          "example": "J'ai embauché une secrétaire"
                        },
                        "besoin": {
                          "type": "string",
                          "example": "ceci est un besoin"
                        },
                        "etapeadv": {
                          "type": "string",
                          "example": "START"
                        },
                        "questions_boite_a_outils_section_1": {
                          "type": "string",
                          "example": "Ceci est une question"
                        },
                        "questions_boite_a_outils_section_2": {
                          "type": "string",
                          "example": "Ceci est une question"
                        },
                        "questions_boite_a_outils_section_3": {
                          "type": "string",
                          "example": "Ceci est une question"
                        },
                        "email": {
                          "type": "string",
                          "example": "quentin+demo-test@madeformed.com"
                        },
                        "firstName": {
                          "type": "string",
                          "example": "Quentin"
                        },
                        "id": {
                          "type": "number",
                          "example": 14533051
                        },
                        "lastName": {
                          "type": "string",
                          "example": "TEST DEMO"
                        }
                      }
                    },
                    "meeting": {
                      "type": "object",
                      "properties": {
                        "endDate": {
                          "type": "string",
                          "example": "2024-01-18T09:30:00Z"
                        },
                        "meetingUrl": {
                          "type": "string",
                          "example": "https://www.google.com/calendar/event?eid=NzVobTJkYjNjaGgzY2I5ajZzcW1hYjlrYzloMzhiOW9jZ3MzZ2JiNjYwcDY0Y2I1NzBzNjhwOWc2YyBxdWVudGluQG1hZGVmb3JtZWQuY29t"
                        },
                        "startDate": {
                          "type": "string",
                          "example": "2024-01-18T09:00:00Z"
                        },
                        "title": {
                          "type": "string",
                          "example": "test"
                        }
                      }
                    },
                    "owner": {
                      "type": "object",
                      "properties": {
                        "firstName": {
                          "type": "string",
                          "example": "Quentin"
                        },
                        "id": {
                          "type": "number",
                          "example": 14533051
                        },
                        "lastName": {
                          "type": "string",
                          "example": "TEST DEMO"
                        }
                      }
                    }
                  }
                },
                "examples": {
                  "Valid": {
                    "value": {
                      "contact": {
                        "besoin": "ceci est un besoin",
                        "email": "quentin+demo-test@madeformed.com",
                        "firstName": "Quentin",
                        "id": 14533051,
                        "lastName": "TEST DEMO"
                      },
                      "meeting": {
                        "endDate": "2024-01-18T09:30:00Z",
                        "meetingUrl": "https://www.google.com/calendar/event?eid=NzVobTJkYjNjaGgzY2I5ajZzcW1hYjlrYzloMzhiOW9jZ3MzZ2JiNjYwcDY0Y2I1NzBzNjhwOWc2YyBxdWVudGluQG1hZGVmb3JtZWQuY29t",
                        "startDate": "2024-01-18T09:00:00Z",
                        "title": "test"
                      },
                      "owner": {
                        "firstName": "Quentin",
                        "id": 14533051,
                        "lastName": "TEST DEMO"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Contact Not Found",
            "headers": {
              "Access-Control-Allow-Origin": {
                "schema": {
                  "type": "string",
                  "example": "*"
                }
              },
              "Alt-Svc": {
                "schema": {
                  "type": "string",
                  "example": "h3=\":443\"; ma=2592000"
                }
              },
              "Content-Length": {
                "schema": {
                  "type": "string",
                  "example": "29"
                }
              },
              "Content-Security-Policy": {
                "schema": {
                  "type": "string",
                  "example": "default-src 'self' https: ;                                                         style-src 'self' https: http: ;                                                         script-src 'self' 'unsafe-inline' 'unsafe-eval' ;                                                         font-src 'self' https: http: ;                                                         media-scr 'self' blob: data: https: http: ;                                                         image-src 'self'  http: https: data: blob: ;                                                         connect-src 'self' https: ;"
                }
              },
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Wed, 17 Jan 2024 09:29:31 GMT"
                }
              },
              "Permissions-Policy": {
                "schema": {
                  "type": "string",
                  "example": "interest-cohort=()"
                }
              },
              "Referrer-Policy": {
                "schema": {
                  "type": "string",
                  "example": "strict-origin-when-cross-origin"
                }
              },
              "Strict-Transport-Security": {
                "schema": {
                  "type": "string",
                  "example": "max-age=31536000;"
                }
              },
              "X-Content-Type-Options": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "X-Powered-By": {
                "schema": {
                  "type": "string",
                  "example": "PHP/7.2.34"
                }
              },
              "X-Xss-Protection": {
                "schema": {
                  "type": "string",
                  "example": "1; mode=block"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "Contact not found"
                    }
                  }
                },
                "examples": {
                  "Contact Not Found": {
                    "value": {
                      "error": "Contact not found"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/contacts/{contact_id}": {
      "put": {
        "tags": [
          "Hubspot"
        ],
        "summary": "Update Contact Fields",
        "description": "Update Contact Fields",
        "operationId": "updateContactFields",
        "parameters": [
          {
            "name": "",
            "in": "query",
            "schema": {
              "type": "string",
              "example": ""
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "data": {
                    "type": "object",
                    "properties": {
                      "poste": {
                        "type": "string",
                        "example": "Médecin généraliste"
                      },
                      "medecin_de_suivi__": {
                        "type": "boolean",
                        "example": true
                      },
                      "mode_d_installation": {
                        "type": "string",
                        "example": "Seul"
                      },
                      "nouveaux_patients__": {
                        "type": "boolean",
                        "example": true
                      },
                      "vad__": {
                        "type": "boolean",
                        "example": true
                      },
                      "current_solution": {
                        "type": "string",
                        "example": "J'ai embauché une secrétaire"
                      },
                      "besoin": {
                        "type": "string",
                        "example": "ceci est un besoin"
                      },
                      "etapeadv": {
                        "type": "string",
                        "example": "START"
                      },
                      "questions_boite_a_outils_section_1": {
                        "type": "string",
                        "example": "Ceci est une question"
                      },
                      "questions_boite_a_outils_section_2": {
                        "type": "string",
                        "example": "Ceci est une question"
                      },
                      "questions_boite_a_outils_section_3": {
                        "type": "string",
                        "example": "Ceci est une question"
                      },
                    }
                  }
                }
              },
              "examples": {
                "Update Contact Fields": {
                  "value": {
                    "data": {
                      "besoin": "ceci est un besoin"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        }
      },
      "parameters": [
        {
          "name": "contact_id",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string",
            "example": "14533051"
          }
        }
      ]
    }
  },
  "tags": [
    {
      "name": "Hubspot"
    }
  ]
} as const;