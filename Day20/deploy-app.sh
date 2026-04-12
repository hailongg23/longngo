sudo systemctl stop tomcat
sleep 30
ls -al target
rm -fr target
mvn install
sleep 30
sudo rm -rf /opt/tomcat/webapps/ROOT*
sudo rm -rf /opt/tomcat/webapps/ROOT
sudo ls -al /opt/tomcat/webapps/
sudo cp target/vprofile-v2.war /opt/tomcat/webapps/ROOT.war
sudo systemctl start tomcat
sleep 30
sudo systemctl status tomcat
