# Special case links

Project links that are not direct Github repository links. We need to do something special for them.

### Custom website

***Solved***

Index | Title                     | URL
------|---------------------------|--------------------
50    | go-joe                    | https://joe-bot.net
342   | gocql                     | http://gocql.github.io
396   | dynamolock                | https://cirello.io/dynamolock
417   | pglock                    | https://cirello.io/pglock
422   | resgate                   | https://resgate.io/
431   | chasquid                  | https://blitiri.com.ar/p/chasquid
585   | oversight                 | https://cirello.io/oversight
600   | go-gtk                    | http://mattn.github.io/go-gtk/
606   | Wails                     | https://wails.app
661   | periph                    | https://periph.io/
681   | JSON-to-Go                | https://mholt.github.io/json-to-go/
1111  | consul                    | https://www.consul.io/
1122  | nsq                       | http://nsq.io/
1151  | apitest                   | https://apitest.dev
1165  | ginkgo                    | http://onsi.github.io/ginkgo/
1179  | gomega                    | http://onsi.github.io/gomega/
1510  | aah                       | https://aahframework.org
1515  | Buffalo                   | http://gobuffalo.io
1541  | REST Layer                | http://rest-layer.io

***Unsolved***

Index | Title                     | URL                | Reason
------|---------------------------|--------------------|---------
953   | mqttPaho                  | https://eclipse.org/paho/clients/golang/ | `mqttPaho` is not split, it needs to match `paho.mqtt.golang`. Maybe splinter into fuzzy regex based on camelCase?
1128  | yakvs                     | https://git.sci4me.com/sci4me/yakvs |  Seems to be broken URL ATM
1172  | gocheck                   | http://labix.org/gocheck | GitHub is one link away
1192  | testmd                    | https://godoc.org/github.com/tvastar/test/cmd/testmd | Github link has just `/test`, not `/testcmd`. Need better fuzzy search?

### Sub-path within github

***Solved***

Index | Title                     | URL
------|---------------------------|--------------------
90    | hiboot cli                | https://github.com/hidevopsio/hiboot/tree/master/pkg/app/cli
119   | gommon/color              | https://github.com/labstack/gommon/tree/master/color
151   | gone/jconf                | https://github.com/One-com/gone/tree/master/jconf
287   | soda                      | https://github.com/gobuffalo/pop/tree/master/soda
419   | raft                      | https://github.com/coreos/etcd/tree/master/raft
702   | gone/log                  | https://github.com/One-com/gone/tree/master/log
876   | VarHandler                | https://github.com/azr/generators/tree/master/varhandler
985   | beego orm                 | https://github.com/astaxie/beego/tree/master/orm
1243  | gommon/bytes              | https://github.com/labstack/gommon/tree/master/bytes

### Gitlab

***TODO***

Index | Title                     | URL
------|---------------------------|--------------------
318   | Squalus                   | https://gitlab.com/qosenergy/squalus
429   | dyndns                    | https://gitlab.com/alcastle/dyndns
491   | stl                       | https://gitlab.com/russoj88/stl
1302  | go-telegraph              | https://gitlab.com/toby3d/telegraph
1479  | uniq                      | https://gitlab.com/skilstak/code/go/uniq

### Github group

***Won't fix***

Index | Title                     | URL
------|---------------------------|--------------------
848   | go-openapi                | https://github.com/go-openapi

### Other VC providers

***Won't fix***

Index | Title                     | URL                
------|---------------------------|--------------------
1007  | vgo                       | https://go.googlesource.com/vgo/
1081  | Interpol                  | https://bitbucket.org/vahidi/interpol

### Official library

***Won't fix***

Index | Title                     | URL                
------|---------------------------|--------------------
1005  | go modules                | https://golang.org/cmd/go/#hdr-Modules__module_versions__and_more
1073  | autocert                  | https://godoc.org/golang.org/x/crypto/acme/autocert

