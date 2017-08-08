# Kyberia Scraper

Simple scraper of kyberia.sk tree.
This scripts logs you in and then scrapes the tree from given node_id

#config.json

	- username - your kyberia.sk username
	- password - your kyberia.sk password
	- node_id - node which you want to scrape

#data.json 

is the output file of your scraped node
structure is:

object key = id of child node
	- p - parent node id 
	- t - text value of the node