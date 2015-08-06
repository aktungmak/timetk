#!/usr/bin/env python

import sqlite3
import time

class DatabaseManager:
    def __init__(self, dbfile):
        self.dbfile = dbfile

        self.cn = sqlite3.connect(self.dbfile)
        self.cn.row_factory = sqlite3.Row

        #all users, their passwords? and their chosen displayname
        self.cn.execute("""
            CREATE TABLE IF NOT EXISTS users
                (user TEXT NOT NULL UNIQUE, 
                 password TEXT, 
                 displayName TEXT NOT NULL)
                """)

        #here is a lookup containing all netcodes by user with the name and a short description
        #also whether the activity is visible in the main view
        self.cn.execute("""
            CREATE TABLE IF NOT EXISTS netcodes
                (user TEXT NOT NULL, 
                 netcode TEXT NOT NULL, 
                 title TEXT, 
                 description TEXT, 
                 visibility INT)
                """)

        #this table lists all the currently running activities
        self.cn.execute("""
            CREATE TABLE IF NOT EXISTS currentActivities
                (user TEXT NOT NULL, 
                 netcode TEXT NOT NULL, 
                 starttime INT NOT NULL)
                """)

        #this is a history of all the completed activities, with start and end times
        self.cn.execute("""
            CREATE TABLE IF NOT EXISTS completedActivities
                (user TEXT NOT NULL, 
                 netcode TEXT NOT NULL, 
                 starttime INT NOT NULL, 
                 endtime INT NOT NULL)
                """)

        self.cn.commit()

    def rToD(self, row):
        "convert an sqlite3.Row to a regular dict"
        return dict(zip(row.keys(), row))


    def activityStart(self, user, netcode, starttime):
        starttime = int(starttime)
        #check if netcode is already in current
        r = self.cn.execute("""
            SELECT * FROM currentActivities 
            WHERE user=? AND netcode=?""", (user, netcode))
        if r.fetchone() is not None:
            #its alredy there (because this is idempotent)
            return True

        try:
            self.cn.execute("""
                INSERT INTO currentActivities
                VALUES (?, ?, ?)""", (user, netcode, starttime))            
            self.cn.commit()
            return True
        except sqlite3.IntegrityError as e:
            print e, "here"
            return False

    def activityEnd(self, user, netcode, endtime):
        try:
            endtime = int(endtime)
            #check if netcode is in currentActivities (it has to be)
            r = self.cn.execute("""
                SELECT starttime FROM currentActivities 
                WHERE user=? AND netcode=?""", (user, netcode))
            #extract start time
            starttime = r.fetchone()
            #remove from currentActivities
            if starttime is None:
                #don't have a record of this, so pass
                return True
            else:
                starttime = starttime[0]
            self.cn.execute("""
                DELETE FROM currentActivities 
                WHERE user=? AND netcode=?""", (user, netcode))
            #insert into tasks
            self.cn.execute("""
                INSERT INTO completedActivities
                VALUES (?, ?, ?, ?)""", (user, netcode, starttime, endtime))
            self.cn.commit()
            return True
        except sqlite3.IntegrityError as e:
            print e
            return False

    def activityCancel(self, user, netcode):
        self.cn.execute("""
            DELETE FROM currentActivities 
            WHERE user=? AND netcode=?""", (user, netcode))
        self.cn.commit()
        return True

    def getUserActivitiesBetween(self, user, begin, end):
        r = self.cn.execute("""
            SELECT completedActivities.*, netcodes.title
            FROM completedActivities
            LEFT OUTER JOIN netcodes
            ON completedActivities.netcode=netcodes.netcode AND completedActivities.user=netcodes.user
            WHERE completedActivities.user=?
            AND 
              ((completedActivities.starttime BETWEEN ? AND ?) 
              OR (completedActivities.endtime BETWEEN ? AND ?));""", (user, begin, end, begin, end))
        return [self.rToD(row) for row in r.fetchall()]

    def applyGrid(self, user, netcode, begin, end, values):
        try: 
            self.cn.execute("""
                DELETE FROM completedActivities
                WHERE user=? AND netcode=?
                AND 
                  ((completedActivities.starttime BETWEEN ? AND ?) 
                  OR (completedActivities.endtime BETWEEN ? AND ?));""", (user, netcode, begin, end, begin, end))

            for v in values:
                self.cn.execute("""
                    INSERT INTO completedActivities
                    VALUES (?, ?, ?, ?)""", (user, netcode, v[0], v[1]))
            self.cn.commit()
            return True
        except sqlite3.IntegrityError as e:
            self.cn.rollback()
            print e
            return False


    def getAllNetcodesForUser(self, user):
        r = self.cn.execute("""
            SELECT netcodes.*, currentActivities.starttime
            FROM netcodes 
            LEFT OUTER JOIN currentActivities
            ON netcodes.netcode=currentActivities.netcode
                AND netcodes.user=currentActivities.user
            WHERE netcodes.user=?""", (str(user),))
        return [self.rToD(row) for row in r.fetchall()]

    def getAllVisibleNetcodesForUser(self, user):
        r = self.cn.execute("""
            SELECT netcodes.*, currentActivities.starttime
            FROM netcodes
            LEFT OUTER JOIN currentActivities
            ON netcodes.netcode=currentActivities.netcode 
                AND netcodes.user=currentActivities.user
            WHERE netcodes.user=? 
                AND netcodes.visibility=1""", (str(user),))
        return [self.rToD(row) for row in r.fetchall()]
        

    def addNetcode(self, user, netcode, title, description, visibility):
        try:
            self.cn.execute("""
                INSERT INTO netcodes
                VALUES (?, ?, ?, ?, ?)""",
                (user, netcode, title, description, visibility))
            self.cn.commit()
            return True
        except sqlite3.IntegrityError as e:
            print e
            return False

    def removeNetcode(self, user, netcode, title):
        self.cn.execute("""
            DELETE FROM netcodes 
            WHERE user=? 
            AND netcode=?
            AND title=?""", (user, netcode, title))
        self.cn.commit()
        return True

    def setNetcodeVisibility(self, user, netcode, title, visibility):
        self.cn.execute("""
            UPDATE netcodes 
            SET visibility=?
            WHERE user=? 
            AND netcode=?
            AND title=?""", (visibility, user, netcode, title))
        self.cn.commit()
        return True

if __name__ == '__main__':
    dm = DatabaseManager('test.db')
    # dm.addNetCode(444, "a name", "shdhsajkasd")

    # dm.activityStart(121, 555, 20)
    # dm.activityEnd(121, 555, 35)
    for d in dm.getAllNetcodesForUser("josh"):
        print d
    # print dm.getUserActivitiesBetween("josh", 1414568990, 1415768996)

