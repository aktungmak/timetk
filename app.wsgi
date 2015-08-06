#!/usr/bin/env python
#stdlib imports
import json
import time
import os
import sys

#change dir to bring in the custom imports
# os.chdir(os.path.dirname(__file__))
# sys.path.append(os.curdir)

#custom imports
import bottle
import database

bottle.debug(True)
print os.path.abspath(os.curdir)
dm = database.DatabaseManager('ttk.db')

# UI routes #######################

@bottle.route('/')
def index():
    "serve the index"
    return bottle.static_file('index.html', root='./ui')

@bottle.route('/<filepath:path>')
def server_static(filepath):
    "serve static files"
    return bottle.static_file(filepath, root='./ui')

# API routes #######################

@bottle.post('/startTimer')
def startTimer():
    "-begin a new timer. idempotent"
    data = json.loads(bottle.request.body.read())
    print data
    dm.activityStart(data['user'], data['netcode'], data['time'])
    # need to check for integrityerror and keyerror!
    
@bottle.post('/stopTimer')
def stopTimer():
    "-stop a timer, if running. idempotent"
    data = json.loads(bottle.request.body.read())
    # print data
    dm.activityEnd(data['user'], data['netcode'], data['time'])
    # need to check for integrityerror and keyerror!

@bottle.post('/cancelTimer')
def cancelTimer():
    "-cancel a timer if it is running. idempotent"
    data = json.loads(bottle.request.body.read())
    # print data
    dm.activityCancel(data['user'], data['netcode'])
    # need to check for integrityerror and keyerror!

@bottle.post('/applyGrid')
def applyGrid():
    "clear all activities for user+netcode between particular date, and repace with grid"
    data = json.loads(bottle.request.body.read())
    #print data
    dm.applyGrid(data['user'], data['netcode'], data['begin'], data['end'], data['values'])
    # need to check for integrityerror and keyerror!    

@bottle.post('/getReport')
def getReport():
    data = json.loads(bottle.request.body.read())
    resp = dm.getUserActivitiesBetween(data['user'], data['begin'], data['end'])
    succ = True if resp else False
    resp = {'activities': resp, 'success': succ}
    return json.dumps(resp)

@bottle.post('/getAllNetcodes')
def getAllNetcodes():
    "-get every netcode associated with user"
    data = json.loads(bottle.request.body.read())
    # print data
    resp = dm.getAllNetcodesForUser(data['user'])
    succ = True if resp else False
    resp = {'activities': resp, 'success': succ}
    return json.dumps(resp)

@bottle.post('/getVisibleNetcodes')
def getVisibleNetcodes():
    "-get only visible netcodes associated with user"
    data = json.loads(bottle.request.body.read())
    # print data
    resp = dm.getAllVisibleNetcodesForUser(data['user'])
    succ = True if resp else False
    resp = {'activities': resp, 'success': succ}
    return json.dumps(resp)

@bottle.post('/addNetcode')
def addNetcode():
    "-add an entry to the netcodes database, they don't all have to be unique!"
    data = json.loads(bottle.request.body.read())
    # print data
    dm.addNetcode(data['user'], data['netcode'], data['title'], data['description'], data['visibility'])
    # need to check for integrityerror and keyerror!

@bottle.post('/removeNetcode')
def removeNetcode():
    "-remove an entry from the netcodes db, if it is there"
    data = json.loads(bottle.request.body.read())
    # print data
    dm.removeNetcode(data['user'], data['netcode'], data['title'])
    # need to check for integrityerror and keyerror!

@bottle.post('/setNetcodeVisibility')
def setNetcodeVisibility():
    "-activate/deactivate netcode, 0 is not visible 1 is visible."
    data = json.loads(bottle.request.body.read())
    # print data
    dm.setNetcodeVisibility(data['user'], data['netcode'], data['title'], data['visibility'])
    # need to check for integrityerror and keyerror!

@bottle.get('/help')
def apiHelp():
    "return docstrings for API calls"
    return "todo"

application = bottle.default_app()

bottle.run() # for dev/debug only
