'use babel';

module.exports = (options) => `
import sbt._

import IO._

import java.io._

scalaVersion := "${options.scalaVersion}"

ivyScala := ivyScala.value map { _.copy(overrideScalaVersion = true) }

// allows local builds of scala
resolvers += Resolver.mavenLocal

resolvers += Resolver.sonatypeRepo("snapshots")

resolvers += "Typesafe repository" at "http://repo.typesafe.com/typesafe/releases/"

resolvers += "Akka Repo" at "http://repo.akka.io/repository"

libraryDependencies ++= Seq(
  "org.ensime" %% "ensime" % "${options.ensimeServerVersion}",
  "org.scala-lang" % "scala-compiler" % scalaVersion.value force(),
  "org.scala-lang" % "scala-reflect" % scalaVersion.value force(),
  "org.scala-lang" % "scalap" % scalaVersion.value force()
)

val saveClasspathTask = TaskKey[Unit]("saveClasspath", "Save the classpath to a file")

saveClasspathTask := {
  val managed = (managedClasspath in Runtime).value.map(_.data.getAbsolutePath)
  val unmanaged = (unmanagedClasspath in Runtime).value.map(_.data.getAbsolutePath)
  val out = file("${options.classpathFilePath}")
  write(out, (unmanaged ++ managed).mkString(File.pathSeparator))
}
`
