# Logstash logger

```
const createLogstash = require('logstash');

// required
const url = process.env.LOGSTASH_URL;

// optional
const tags = ['production', 'api'];
const level = "info";

// Create logger instance
const logger = createLogstash(url, tags, level);

logger.info("Hello Logger!", { data: 123 });
```
