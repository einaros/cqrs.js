# cqrs.js

cqrs.js is a library which aims to make it simple to implement CQRS (Command/Query Responsibility Segregation) based applications on the node.js platform.

Implementing CQRS usually, but not necessarily, involves event sourcing.

## EventSourcing

The domain side in a CQRS based application will be event sourced, meaning that object state is described by an event stream, rather than by a snapshot of the data in a database.

## Command Execution

Command execution happens by a service first using the repository to revive an agregate root. The aggregate root's state is brought back by replaying an event stream. When the object is current, commands are executed on it. These commands can lead to one or more events, which are responsible for mutating the object's state. Finally the service code will save the aggregate back to the repository.

### Batching Commands

Commands can be batched from client to server, simply by having the client load an aggregate once, execute all commands and only then to save it back to the repository.

Cross-aggregate command batches isn't currently within the scope of cqrs.js.

## Event Conflicts

When events for an aggregate are saved, the event store first has to veirfy that the expected target version of the aggregate (as seen by the client when the object was mutated) is the latest. If it is not, a ConcurrencyException is thrown by the event store, indicating to the repository that an event merge will have to be made. The event merge is a synchronous process which requires each of the client caused events to be merged against all events which have arrived between the point in time at which the object was fetched from the repository and the point in time at which the object was attempted saved back to the repo.

The EventStore included in this module accepts a merge dictionary which allows you define a set of rules of events which may be merged against against each-other. An example of a merge requirement would be:

* Users Foo and Bar both load the profile page of a Customer C. At this point they both see the same version of the data.
* User Foo submits a PersonNameSpellingCorrection command to update Customer C's name. User Bar does not refresh his browser, and thus still sees the original version.
* User Bar submits a PersonNameChange command to update Customer C's name, as a result of him/her legally changing names. Along with this command, Bar indicates that the Customer aggregate version he saw was the original one - as he has still not gotten the update sent by Foo.
* On the server side, the domain model processes the change. Finally the eventstore tries to save the PersonNameChanged event, and notices that a PersonNameSpellingCorrected event had arrived after Bar update his data (based on version comparisons). By default, the eventstore would issue a concurrency error at this point, which would force user Bar to refresh his view and submit the command again. Given a set of event merge paths, however, the eventstore can be instructed to recognize that persons actually changing their legal name is a more important change than a spelling correction, and that the unseen spelling correction can be ignored - causing the rename to succeed.

The consequence of event merging in this case is a more comfortable use experience for user Bar: he / she would not have to update his browser each and every time a change is pushed from another user.