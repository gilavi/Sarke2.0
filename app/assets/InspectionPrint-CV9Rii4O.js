import{a3 as O,G as U,r as N,J as E,j as k}from"./vendor-B5f9jK7Q.js";import{ab as G,W,Z as Q,g as K,ac as V,_ as Y,$ as J}from"./index-C2M2NlvO.js";import"./threejs-BOQm7Cob.js";import"./supabase-cgUBL7BF.js";import"./icons-CRI8W5aM.js";import"./leaflet-BLSl-qpF.js";const Z={expert:"შრომის უსაფრთხოების სპეციალისტი",xaracho_supervisor:"ხარაჩოს ზედამხედველი",xaracho_assembler:"ხარაჩოს ამწყობი",other:"სხვა"},ee={save:"შენახვა",cancel:"გაუქმება",delete:"წაშლა",edit:"რედაქტირება",add:"დამატება",create:"შექმნა",close:"დახურვა",back:"უკან",done:"დასრულება",next:"შემდეგი",skip:"გამოტოვება",continue:"გაგრძელება",confirm:"დადასტურება",send:"გაგზავნა",resend:"ხელახლა გაგზავნა",remove:"წაშლა",yes:"კი",no:"არა",ok:"კარგი",localeTag:"ka-GE",loading:"იტვირთება…",retry:"ხელახლა ცდა",search:"ძიება",empty:"ცარიელია",draft:"დრაფტი",completed:"დასრულდა",required:"სავალდებულო",optional:"სურვილის შემთხვევაში",all:"ყველა",new:"ახალი",project:"პროექტი",inspection:"შემოწმების აქტი",certificate:"სერტიფიკატი",qualification:"სერტიფიკატები",signature:"ხელმოწერა",signer:"ხელმომწერი",status:"სტატუსი",date:"თარიღი",name:"სახელი",company:"კომპანია",address:"მისამართი",phone:"ტელეფონი",position:"პოზიცია",role:"როლი",email:"ელ-ფოსტა",password:"პაროლი",help:"დახმარება"},te={close:"დახურვა",closeHint:"შეეხეთ დასახურად",addPhoto:"ფოტოს დამატება",addPhotoHint:"შეეხეთ ახალი ფოტოს ასატვირთად",viewPhoto:"ფოტოს ნახვა",viewPhotoHint:"შეეხეთ ფოტოს დიდად სანახავად",deleteSigner:"მონაწილის წაშლა",deleteSignerHint:"ამ მონაწილის წაშლა",deleteMember:"წაშლა",deleteMemberHint:"მონაწილის წაშლა",addMember:"დამატება",addMemberHint:"ახალი მონაწილის დამატება",saveSignature:"შენახვა",saveSignatureHint:"ხელმოწერის შენახვა",clearSignature:"გასუფთავება",clearSignatureHint:"ხელმოწერის გასუფთავება",selectRole:"აირჩიეთ როლი",selectTemplate:"აირჩიეთ შაბლონი",backToInspection:"შემოწმების აქტი — დაბრუნება",backToInspectionHint:"გადავა შემოწმების აქტის ეკრანზე",retryLoading:"ხელახლა ცდა",newCertificate:"ახალი სერტიფიკატი",newCertificateHint:"სერტიფიკატის დამატება",closeSheet:"დახურვა",closeSheetHint:"ფორმის დახურვა",closePreview:"დახურვა",closePreviewHint:"პრევიუს დახურვა",resumeDraft:"შევსების გაგრძელება",help:"დახმარება"},ae={unknown:"უცნობი შეცდომა",invalidEmailOrPassword:"არასწორი ელ-ფოსტა ან პაროლი",confirmEmailFirst:"გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა",passwordTooShort:"პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",tooManyAttempts:"ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ",network:"ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი",operationCancelled:"ოპერაცია გაუქმდა",notFound:"მონაცემი ვერ მოიძებნა",forbidden:"წვდომა აკრძალულია",alreadyExists:"უკვე არსებობს",requiredField:"სავალდებულო ველი",invalidPhoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",deleteFailed:"წაშლა ვერ მოხერხდა",createFailed:"შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",uploadFailed:"ატვირთვა ვერ მოხერხდა",generationFailed:"გენერაცია ვერ მოხერხდა",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",loadFailed:"ჩატვირთვა ვერ მოხერხდა",previewFailed:"პრევიუს ჩატვირთვა ვერ მოხერხდა",invalidAnswerFormat:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",needsInternetForPhoto:"ფოტოს ასატვირთად საჭიროა ინტერნეტი",cameraPermission:"კამერაზე წვდომა საჭიროა",galleryPermission:"გალერეაზე წვდომა საჭიროა",authRequired:"ავტორიზაცია საჭიროა",photoPermission:"ფოტოზე წვდომა არ არის",notFoundInspection:"შემოწმების აქტი ვერ მოიძებნა",notFoundTemplate:"შაბლონი არ არის",notFoundProject:"პროექტი ვერ მოიძებნა",missingQualification:"აკლია სერტიფიკატები",missingQualificationDesc:"მიუთითეთ: {{types}}",signatureRequired:"ხელმოწერა საჭიროა",signatureRequiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",missingFields:"შეავსეთ: {{fields}}",pdfNotGeneratedYet:"ჯერ დააგენერირე PDF რეპორტი",inspectionNotSpecified:"შემოწმების აქტი არ არის მითითებული",dataStillLoading:"მონაცემები ჯერ იტვირთება",googleCalendarNotConnected:"ჯერ მიაერთეთ Google კალენდარი",googleSessionExpired:"Google სესია ამოიწურა — შეაერთე თავიდან",googleCalendarDisconnected:"Google კალენდარი გაითიშა",googleCalendarConnected:"Google კალენდარი შეერთდა"},oe={channelName:"შემოწმების აქტის შეხსენება",fallbackItemName:"შემოწმების აქტი",expiringTomorrowTitle:"ვადა გასდის ხვალ",addedToCalendar:"დაემატა: {{count}}",smsSent:"SMS გაიგზავნა",smsResent:"SMS ხელახლა გაიგზავნა",pdfDeleted:"PDF რეპორტი წაიშალა",requestDeleted:"მოთხოვნა წაიშალა",certificateUploaded:"სერტიფიკატი აიტვირთა",photoUploaded:"ფოტო აიტვირთა",photoDeleted:"ფოტო წაიშალა",signatureSaved:"ხელმოწერა შენახულია",projectCreated:"პროექტი შეიქმნა",undoLabel:"დაბრუნება",draftLoaded:"ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.",deleted:"წაიშალა",languageChanged:"ენა შეიცვალა",signedOut:"გასვლა შესრულდა",signOutFailed:"გასვლა ვერ მოხდა"},ie={home:"მთავარი",homeA11y:"მთავარი გვერდი",projects:"პროექტები",projectsA11y:"პროექტების სია",calendar:"კალენდარი",calendarA11y:"კალენდარი — განრიგი",regulations:"რეგულაციები",regulationsA11y:"რეგულაციები და სტანდარტები",more:"მეტი",moreA11y:"დამატებითი მენიუ",backToHome:"მთავარ გვერდზე",backToMore:"მეტი"},ne={brand:"Sarke",tagline:"შრომის უსაფრთხოების ექსპერტი",login:"შესვლა",register:"რეგისტრაცია",loginWithGoogle:"Google-ით შესვლა",registerWithGoogle:"Google-ით რეგისტრაცია",forgotPassword:"პაროლი დაგავიწყდა?",resetPassword:"პაროლის აღდგენა",resetSent:`პაროლის განახლების ბმული გაიგზავნა
{{email}}-ზე.`,resetInstructions:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.",sendLink:"გაგზავნა",enterValidEmail:"გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა",passwordMinLength:"პაროლი (მინ. {{min}} სიმბოლო)",emailPlaceholder:"you@example.com",firstName:"სახელი",lastName:"გვარი",firstNamePlaceholder:"გიორგი",lastNamePlaceholder:"ხელაძე",emailAlreadyInUse:"ელ-ფოსტა უკვე გამოიყენება",emailAlreadyInUseDesc:"ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?",or:"ან",linkSent:"ბმული გაიგზავნა",linkSentBody:"შეამოწმეთ {{email}}. ბმულზე დაჭერით დაბრუნდებით აპლიკაციაში ახალი პაროლის შესაყვანად.",resetTitle:"პაროლის აღდგენა",resetSubtitle:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.",checkEmail:"შეამოწმეთ ელ-ფოსტა",verifyCodeSent:"დადასტურების ბმული გაიგზავნა {{email}}-ზე. დააჭირეთ ბმულს ელ-ფოსტაში, ან შეიყვანეთ კოდი ქვემოთ.",verifyConfirm:"დადასტურება",didntReceiveCode:"კოდი არ მიგიღიათ?",resend:"ხელახლა გაგზავნა",resendIn:"ხელახლა გაგზავნა ({{n}}წ)",codeSent:"კოდი გამოგზავნილია",codeExpired:"კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.",invalidCode:"არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ."},se={greetingNight:"მოგესალმებით",greetingMorning:"დილა მშვიდობისა",greetingAfternoon:"გამარჯობა",greetingEvening:"საღამო მშვიდობისა",resumeDraft:"გააგრძელეთ დრაფტი",newInspection:"ახალი შემოწმების აქტი",chooseProjectStart:"აირჩიეთ პროექტი და დაიწყეთ",uploadCertificates:"ატვირთეთ სერტიფიკატები",certExpiring:"{{count}} სერტიფიკატი იწურება",certExpiringSuffix:"სერტიფიკატი იწურება",pdfIncluded:"PDF რეპორტს ავტომატურად ერთვის.",checkDeadlines:"შეამოწმეთ ვადები, სანამ ობიექტი არ გაჩერდება.",sectionProjects:"პროექტები",allProjects:"ყველა",newProject:"ახალი პროექტი",createFirst:"შექმენით პირველი",recentActivity:"ბოლო აქტივობა",recentActs:"ბოლო აქტები",fetchError:"მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ კავშირი და ჩამოათრიეთ განახლებისთვის",allActivity:"ყველა",startInspectionSheetTitle:"შემოწმების აქტის დაწყება",addNewProjectSheet:"ახალი პროექტის დამატება",noProjectsYet:"პროექტი ჯერ არ გაქვს",noProjectsHint:'შეეხეთ "ახალი პროექტის დამატება"',chooseTemplate:"აირჩიეთ შაბლონი",newProjectFormTitle:"ახალი პროექტი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",companyPlaceholder:"შემკვეთი",tipOfDay:"რჩევა დღისთვის",tip1:"ხარაჩოს ინსპექტირებამდე დარწმუნდით, რომ ქამარი და მუზარადი გაქვთ.",tip2:"ქარი 15 მ/წმ-ზე მეტი — შეაჩერეთ სიმაღლის სამუშაოები.",tip3:"ქამრის შემოწმების აქტი: შეამოწმეთ ნაკერები და ბალთები, არა მხოლოდ ზოლი.",tip4:"ფოტოები რეპორტს 3-ჯერ უფრო სანდოს ხდის — გადაიღეთ ყოველი ცვლილება.",tip5:"ხარაჩოს ფეხები უნდა იდგას მტკიცე, თანაბარ ზედაპირზე.",tip6:"ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა, ვიდრე ერთი.",tip7:"სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმეთ ფიცრის ლპობა.",relNow:"ახლა",relMinAgo:"{{n}} წთ. წინ",relHourAgo:"{{n}} სთ. წინ",relDayAgo:"{{n}} დღის წინ"},re={title:"პროექტები",yourProjects:"შენი პროექტები",subtitle:"აქ ჩანს თქვენი ყველა მიმდინარე პროექტი",tapForDetails:"შეეხეთ პროექტს დეტალების სანახავად",addProject:"ახალი პროექტი",addProjectSubtitle:"დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად",yourProfile:"შენი პროფილი",profileSubtitle:"აქ არის შენი ხელმოწერა და პარამეტრები",noProjects:"ჯერ პროექტი არ არის",noProjectsHint:"შექმენით პირველი პროექტი და დაიწყეთ შემოწმების აქტები",createProject:"+ ახალი პროექტი",changePhoto:"სურათის შეცვლა",createButton:"შექმნა",clientPlaceholder:"შემკვეთი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",nameLabel:"სახელი",companyLabel:"კომპანია",addressLabel:"მისამართი",deleteConfirm:"{{name}} — ყველა შემოწმების აქტსთან ერთად წაიშლება. გავაგრძელოთ?",draft:"დრაფტი",completed:"დასრულდა",tourProjectInfo:"პროექტის ინფო",tourProjectInfoBody:"შეეხეთ ბარათს რედაქტირებისთვის",tourCrew:"მონაწილეები",tourCrewBody:"დაამატეთ გუნდი შემოწმების აქტის დაწყებამდე",tourFiles:"ბრძანებები",tourFilesBody:"აქ იქმნება ბრძანებები და ინახება ფაილები",tourHistory:"შემოწმების აქტები",tourHistoryBody:"თქვენი შემოწმების აქტების ისტორია",tourNewInspection:"ახალი შემოწმების აქტი",tourNewInspectionBody:"დააჭირეთ და დაიწყეთ ახალი შემოწმების აქტი",inspectorFallback:"ინსპექტორი",memberSaveError:"მონაწილე ვერ შეინახა",templateMissing:"შაბლონი არ არის",chooseTemplateTitle:"აირჩიეთ შაბლონი",cancelOption:"გაუქმება",noCompletedInspections:"ჯერ არ არის დასრულებული",logoUpdated:"ლოგო განახლდა",logoSaveFailed:"ლოგო ვერ შეინახა",logoRemove:"ლოგოს წაშლა",galleryAccessDenied:"გალერეაზე წვდომა აკრძალულია",uploaded:"აიტვირთა",fileOpenFailed:"ფაილი ვერ გაიხსნა",saved:"შენახულია",draftsSection:"დრაფტები",completedSection:"დასრულებული",questionnairesSection:"შემოწმების აქტები",participantsSection:"მონაწილეები",edit:"რედაქტირება"},le={newTitle:"ახალი მონაწილე",editTitle:"მონაწილის რედაქტირება",fullNamePlaceholder:"გიორგი ხელაძე",phonePlaceholder:"+995 5XX XX XX XX",positionPlaceholder:"მაგ. ზედამხედველი",noSignature:"ხელმოწერა შენახული არ არის",drawSignature:"ხელმოწერის დახატვა",redrawSignature:"ხელახლა დახატვა",signatureField:"ხელმოწერა",addButton:"დამატება",saveButton:"შენახვა",clearButton:"გასუფთავება",added:"დაემატა",updated:"განახლდა"},de={title:"შემოწმების აქტი",backTitle:"მთავარი",notFoundTitle:"შემოწმების აქტი ვერ მოიძებნა",notFoundDesc:"შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.",statusSafe:"✓ უსაფრთხოა",statusProblems:"⚠ გამოვლენილია პრობლემები",problemsSection:"გამოვლენილი პრობლემები",checked:"შემოწმდა",problem:"პრობლემა",skipped:"გამოტოვდა",participants:"მონაწილეები",signed:"ხელი მოწერილი",notPresent:"არ ესწრებოდა",pdfGenerateAndSend:"PDF გენერირება და გაგზავნა",pdfPreview:"PDF პრევიუ",pdfReportsCount:"PDF რეპორტები ({{count}})",previewModalTitle:"PDF პრევიუ",previewLoading:"პრევიუ იტვირთება…",safe:"უსაფრთხოა",notSafe:"არ არის უსაფრთხო",remoteNotSent:"არ გაგზავნილა",remoteSent:"გაგზავნილია",remoteSigned:"ხელმოწერილი",remoteDeclined:"უარი თქვა",remoteExpired:"ვადაგასული",sendSms:"SMS-ის გაგზავნა",resendSms:"ხელახლა გაგზავნა",cancelRemote:"გაუქმება",wizardStepConclusion:"დასკვნა",wizardStepHarnessCount:"ქამარების რაოდენობა",wizardStepHarnessCheck:"ქამარების შემოწმება",wizardStepComponent:"კომპონენტი • {{row}}",wizardStepCheck:"შემოწმება",wizardStepMeasure:"გაზომვა",wizardStepNote:"შენიშვნა",wizardStepPhoto:"ფოტო",loadError:"არ მოიძებნა",answerFormatError:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",loadErrorWithDetail:"ჩატვირთვა ვერ მოხერხდა: {{detail}}",photoUploading:"ფოტოები იტვირთება ({{count}})…",photoUploadingSingle:"ფოტო იტვირთება…",footerComplete:"დასრულება",footerNextAnswered:"შემდეგი",footerNextUnanswered:"გამოტოვება",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleteCancel:"გაუქმება",deleteConfirm:"წაშლა",photoLabel:"ფოტო",noteLabel:"შენიშვნა",textPlaceholder:"შეავსეთ აქ...",missingSafetyStatus:"უსაფრთხოების სტატუსი",missingConclusion:"დასკვნა",missingHarnessName:"ქამრის დასახელება",completeError:"შემოწმების აქტის დასრულება ვერ მოხერხდა: {{detail}}",exitTitle:"გასვლა?",exitBody:"გასვლისას პასუხები შეინახება, მაგრამ შემოწმების აქტი არ დასრულდება.",exitStay:"გაგრძელება",exitLeave:"გასვლა",commentPlaceholder:"კომენტარი",additionalCommentPlaceholder:"დამატებითი კომენტარი (არასავალდებულო)",harnessModelPlaceholder:"მაგ. Petzl NEWTON",describeDetailedPlaceholder:"აღწერეთ დეტალურად...",viewPreview:"პრევიუს ნახვა",viewInspection:"შემოწმების აქტის ნახვა",backToHome:"მთავარ გვერდზე"},ce={title:"PDF რეპორტები",emptyTitle:"PDF რეპორტი ჯერ არ გაქვთ",emptyHint:"დაასრულეთ შემოწმების აქტი და დააგენერირეთ პირველი PDF რეპორტი",emptyAction:"ახალი შემოწმების აქტი",pdfReport:"PDF რეპორტი",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",newTitle:"PDF რეპორტის გენერაცია",qualificationMissingTitle:"სერტიფიკატები არ არის",qualificationMissingDesc:"ატვირთეთ სერტიფიკატი ან ახლავე ატვირთეთ ახალი.",uploadAction:"ატვირთვა",noOtherQualifications:"სხვა სერტიფიკატები არ არის",inspectionLabel:"შემოწმების აქტი",chiefEngineer:"მთავარი ინჟინერი",safetySpecialist:"შრომის უსაფრთხოების სპეციალისტი",drawAction:"დახატვა",changeAction:"შეცვლა",signaturePlaceholder:"ხელმოწერა",otherSigners:"სხვა ხელმომწერები",signerSignatureOf:"{{name}}-ის ხელმოწერა",signatureRequired:"ხელმოწერა საჭიროა",addSignerOptional:"სურვილის შემთხვევაში — დაამატეთ სხვა ხელმომწერი",signerNamePlaceholder:"სახელი გვარი",enterNameFirst:"ჯერ შეიყვანეთ სახელი",newSigner:"ახალი ხელმომწერი",qualificationCerts:"სერტიფიკატები",notSelected:"არ არის არჩეული",uploaded:"ატვირთულია",certNumber:"№ {{number}}",changeCert:"შეცვლა",selectCert:"არჩევა",selectAllRequired:"არჩიე ყველა საჭირო სერტიფიკატი",additionalCerts:"დამატებითი სერტიფიკატები",addOtherQualifications:"სურვილის შემთხვევაში — დაამატეთ სხვა სერტიფიკატი",addButton:"+ დამატება",previewButton:"პრევიუ",generateButton:"PDF-ის გენერაცია",generateSuccess:"PDF რეპორტი შეიქმნა",assetsMissing:"{{count}} სურათი ვერ ჩაიდო — გამოჩნდება ჩანაცვლების ნიშნით.",previewFailedTitle:"პრევიუ ვერ აიწყო",sendSmsSuccess:"SMS გაიგზავნა",expertSignatureNeeded:'ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან',addLogoTitle:"ლოგოს დამატება",addLogoBody:"პროექტს ჯერ არ აქვს ლოგო. გსურთ მისი დამატება PDF-ის გენერაციამდე?",addLogoAdd:"დამატება",logoSaveFailed:"ლოგო ვერ შეინახა",localCopyMissing:'ამ მოწყობილობაზე ლოკალური ასლი არ არის. დააჭირეთ "გაზიარება".'},pe={title:"სერტიფიკატები",backTitle:"მეტი",requiredCerts:"სავალდებულო სერტიფიკატები",additionalCerts:"დამატებითი სერტიფიკატები"},ge={title:"ისტორია",backTitle:"მეტი",draftsSection:"დრაფტები",completedSection:"დასრულებული",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",inspectionA11y:"შემოწმების აქტი",viewCompleted:"დასრულებული შემოწმების აქტის ნახვა",resumeDraft:"დრაფტის გაგრძელება",emptyTitle:"ისტორია ცარიელია",emptyHint:"დასრულებული შემოწმების აქტები გამოჩნდება აქ",startInspection:"შემოწმების აქტის დაწყება"},ue={title:"მეტი",projectsCount:"პროექტი",completedCount:"დასრულდა",draftCount:"დრაფტი",history:"ისტორია",lastInspection:"ბოლო: {{date}}",emptyLast:"ცარიელია",qualifications:"სერტიფიკატები",expiringCount:"{{count}} იწურება",uploadPrompt:"დააჭირეთ ასატვირთად",allActive:"ყველა აქტიური",templates:"შაბლონები",system:"სისტემა",regulations:"რეგულაციები",document:"დოკუმენტი",mySignature:"ჩემი ხელმოწერა",drawSignature:"ხელმოწერის დახატვა",terms:"წესები და პირობები",signOut:"გასვლა",privacyPolicy:"კონფიდენციალურობის პოლიტიკა",privacyNoShare:"Sarke 2.0 არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.",privacyPhotos:"ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში",privacyPdf:"PDF რეპორტები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის",privacyDelete:"მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან",privacySupabase:"ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე",copyright:"© 2026 Sarke 2.0 · ყველა უფლება დაცულია",settings:"პარამეტრები",darkMode:"მუქი რეჟიმი",language:"ენა / Language",pdfLanguage:"PDF ენა",changePassword:"პაროლის შეცვლა",signOutConfirmTitle:"გასვლა",signOutConfirmBody:"დარწმუნებული ხართ?"},fe={title:"კალენდარი",sync:"სინქრონიზაცია",filterExpired:"ვადაგასული",filterThisWeek:"ამ კვირას",filterThisMonth:"ამ თვეში",prevMonth:"წინა თვე",nextMonth:"შემდეგი თვე",noTemplate:"შაბლონი არ არის",noProject:"პროექტი ვერ მოიძებნა",chooseTemplate:"აირჩიეთ შაბლონი",createFailed:"შექმნა ვერ მოხერხდა",connectGoogleFirst:"ჯერ მიაერთეთ Google კალენდარი",addedCount:"დაემატა: {{count}}",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",noInspections:"შემოწმების აქტი არ არის ამ დღეს.",today:"დღეს",start:"დაწყება",inspectionCount:"{{count}} შემოწმების აქტი",weekdayLabels:["ორშ","სამ","ოთხ","ხუთ","პარ","შაბ","კვ"],monthLabels:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],monthLabelsShort:["იან","თებ","მარ","აპრ","მაი","ივნ","ივლ","აგვ","სექ","ოქტ","ნოე","დეკ"],filterAll:"ყველა",filterInspection:"შემოწმება",filterBriefing:"ინსტრუქტაჟი",filterOverdue:"ვადა გასული",filterUpcoming:"დაგეგმილი",filterProject:"პროექტი",allProjects:"ყველა პროექტი",goToSite:"დღეს ობიექტზე ვარ",emptyDay:"ამ დღეს მოვლენები არ არის",emptyFilter:"ფილტრი — მოვლენები ვერ მოიძება",allCaughtUp:"ყველა ვადა დაცულია",overdueDays:"{{count}} დღე გადაცილდა",inDays:"{{count}} დღეში",dueToday:"დღეს",jumpToToday:"დღეს",upcomingSection:"შეხსენებები"},me={title:"რეგულაციები",neverUpdated:"არასდროს",updatedToday:"დღეს, {{time}}",lastUpdate:"ბოლო განახლება: {{date}}",updatedBadge:"განახლდა",updatedDate:"განახლდა: {{date}}",openLinkA11y:"{{title}} — გახსნა",sourceLabel:"matsne.gov.ge"},he={confirmKa:"დადასტურება",confirmEn:"Confirm",declineWarning:"უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.",cancelKa:"გაუქმება",cancelEn:"Cancel",signOutKa:"გასვლა",signOutEn:"Sign out",langKa:"ქართული",langEn:"English",viewInBrowser:"ვერსიის ნახვა ბრაუზერში",agree:"ვეთანხმები",disagree:"არ ვეთანხმები"},ve={saved:"ხელმოწერა შენახულია",saveError:"შენახვა ვერ მოხერხდა",requiredTitle:"ხელმოწერა საჭიროა",requiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",eyebrow:"ხელმოწერა",fallbackName:"ხელმომწერი",signHereHint:"ხელი მოაწერეთ ჩარჩოში"},be={title:"ხელმოწერის გარე მოთხოვნა",description:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",roleLabel:"როლი",nameLabel:"სახელი გვარი",namePlaceholder:"გიორგი ხელაძე",phoneLabel:"ტელეფონი",phonePlaceholder:"+995 5XX XXX XXX",cancel:"გაუქმება",sendSms:"SMS-ის გაგზავნა"},xe={rolePresets:["ზედამხედველი","ხარაჩოს ამწყობი"],addSheetTitle:"მონაწილის დამატება",nameLabel:"სახელი",namePlaceholder:"მაგ. გიორგი მელაძე",roleLabel:"როლი",saveButton:"შენახვა"},ye={topics:{scaffold_safety:"ხარაჩოს უსაფრთხოება",height_work:"სიმაღლეზე მუშაობა",ppe:"დამცავი აღჭურვილობა",evacuation:"საევაკუაციო გეგმა",fire_safety:"ხანძარსაწინააღმდეგო",other:"სხვა"}},we={tocTitle:"შინაარსი",tocQuestionCount:"{{count}} კითხვა",attachedCerts:"თანდართული სერტიფიკატები",certIssued:"გაცემა: {{date}}",certExpires:"ვადა: {{date}}",imageUnavailable:"სურათი მიუწვდომელია",statusNotSafe:"✗ არ არის უსაფრთხო ექსპლუატაციისთვის",statusSafe:"✓ უსაფრთხოა ექსპლუატაციისთვის",statusIncomplete:"● შეფასება დაუსრულებელია",watermarkDraft:"დრაფტი / DRAFT",previewBanner:"👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.",htmlTitle:"Sarke — {{templateName}}",systemName:"შრომის უსაფრთხოების ექსპერტული სისტემა",footerText:"Sarke 2.0 · {{systemName}} · გვერდი ",metaDate:"თარიღი: {{date}}",metaObject:"ობიექტი: {{name}}",metaId:"ID: {{id}}",infoCompany:"კომპანია",infoObject:"ობიექტი",infoHarness:"ქამრის დასახელება",infoStatus:"სტატუსი",conclusionTitle:"დასკვნა",signaturesTitle:"ხელმოწერები",commentLabel:"კომენტარი",notesLabel:"შენიშვნა",photosTitle:"📷 ფოტო მასალა",yes:"კი",no:"არა",expertLabel:"ექსპერტი",timeLabel:"დრო",locationLabel:"ლოკაცია",deviceLabel:"მოწყობილობა",photoAlt:"ფოტო",signatureAlt:"ხელმოწერა"},$e={statusBadgePass:"უსაფრთხოა",statusBadgeFail:"არ არის უსაფრთხო",statusBadgePending:"მოლოდინში",offlineBanner:"ხაზგარეშე — ცვლილებები ინახება ლოკალურად",errorStateTitle:"ვერ ჩაიტვირთა",errorStateRetry:"ხელახლა ცდა",errorBoundaryTitle:"მოხდა შეცდომა",errorBoundarySubtitle:"გთხოვთ, სცადოთ თავიდან",errorBoundaryRetry:"თავიდან ცდა",skeletonMapNoLocation:"ლოკაცია არ დაემატა",skeletonMapAddLocation:"ლოკაციის დამატება"},Se={expert:"შრომის უსაფრთხოების სპეციალისტი",xarachoSupervisor:"ხარაჩოს ზედამხედველი",xarachoAssembler:"ხარაჩოს ამწყობი",other:"სხვა"},ke={title:"ანგარიშის პარამეტრები",currentPassword:"მიმდინარე პაროლი",newPassword:"ახალი პაროლი",confirmNewPassword:"გაიმეორეთ ახალი პაროლი",passwordPlaceholder:"პაროლი",repeatPasswordPlaceholder:"გაიმეორეთ პაროლი",changePassword:"პაროლის შეცვლა",changing:"იცვლება…",currentPasswordRequired:"მიმდინარე პაროლი აუცილებელია",currentPasswordWrong:"მიმდინარე პაროლი არასწორია",passwordMinLengthError:"ახალი პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",passwordMustDiffer:"ახალი პაროლი უნდა იყოს განსხვავებული",passwordsMismatch:"პაროლები არ ემთხვევა",passwordCharCount:"{{n}}/{{min}} სიმბოლო",passwordChanged:"პაროლი შეიცვალა"},Pe={title:"გვერდი არ მოიძებნა",body:"ეს გვერდი არ არსებობს ან წაშლილია.",backHome:"მთავარ გვერდზე"},Fe={common:ee,a11y:te,errors:ae,notifications:oe,tabs:ie,auth:ne,home:se,projects:re,projectSigner:le,inspections:de,certificates:ce,qualifications:pe,history:ge,more:ue,calendar:fe,regulations:me,termsScreen:he,signature:ve,remoteSigner:be,crew:xe,briefings:ye,pdf:we,components:$e,roles:Se,account:ke,notFound:Pe};function D(a,t){const c=a.split(".");let s=Fe;for(const e of c)if(s=s==null?void 0:s[e],s===void 0)break;if(typeof s=="string")return t?s.replace(/\{\{(\w+)\}\}/g,(e,r)=>String(t[r]??"")):s}function _e(a){var g;const{questionnaire:t,template:c,project:s,questions:e,answers:r,signatures:u,photosByAnswer:m={},attachments:l=[],mode:d="pdf"}=a,i=(n,f)=>D(n,f)??n,p=d==="pdf",y=t.status!=="completed",j=n=>r.find(f=>f.question_id===n.id),v=t.created_at?new Date(t.created_at).toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}):"—",b=t.id.slice(0,8).toUpperCase();let S=null;e:for(const n of Object.values(m))for(const f of n){const C=f.address??((g=f.caption)!=null&&g.startsWith("addr:")?f.caption.slice(5):null);if(C){S=C;break e}}const P=Array.from(new Set(e.map(n=>n.section))).sort((n,f)=>n-f),T=P.map((n,f)=>{const C=e.filter($=>$.section===n);return`<div class="toc-item"><span class="toc-num">${M(f+1)}</span><span class="toc-name">${o(String(n))}</span><span class="toc-count">${i("pdf.tocQuestionCount",{count:C.length})}</span></div>`}).join(""),L=P.map((n,f)=>{const C=e.filter($=>$.section===n).sort(($,x)=>$.order-x.order).map($=>{const x=j($),X=x?m[x.id]??[]:[],R=(x==null?void 0:x.value_bool)===!1;return Ce($,x,X,R,i)}).join("");return`
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(f+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${o(String(n))}</span>
            </h2>
          </div>
          <div class="section-body">${C}</div>
        </div>
      `}).join(""),F=Ee(u),_=l.length>0?`
        <div class="section" ${p?'style="page-break-before: always;"':""}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(P.length+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${i("pdf.attachedCerts")}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${l.map(n=>`
              <div class="cert-card">
                <div class="cert-title">${o(n.cert_type)}</div>
                ${n.cert_number?`<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${o(n.cert_number)}</div>`:""}
                ${n.photo_data_url?`<div class="cert-img-wrap">
                      <img src="${n.photo_data_url}" alt="${o(n.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${o(i("pdf.imageUnavailable"))}</div>';" />
                    </div>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `:"",h=t.is_safe_for_use===!0,w=t.is_safe_for_use===!1,z=h?"hero-pass":w?"hero-fail":"hero-pending",A=h?"✓":w?"⚠":"…",q=i(h?"pdf.statusSafe":w?"pdf.statusNotSafe":"pdf.statusIncomplete"),B=`
    <div class="status-hero ${z}">
      <span class="status-hero-icon">${A}</span>
      <span class="status-hero-text">${q}</span>
    </div>
  `,I=w?`<span class="status-badge status-fail">${i("pdf.statusNotSafe")}</span>`:h?`<span class="status-badge status-pass">${i("pdf.statusSafe")}</span>`:`<span class="status-badge status-pending">${i("pdf.statusIncomplete")}</span>`,H=y?`<div class="watermark">${i("pdf.watermarkDraft")}</div>`:"";return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${i("pdf.htmlTitle",{templateName:o(c.name)})}</title>
  <style>
    :root {
      --green: #1D9E75;
      --green-dark: #147A4F;
      --green-tint: #E8F5F0;
      --red: #DC2626;
      --red-tint: #FCEBEB;
      --amber: #B45309;
      --amber-bg: #FEF3C7;
      --ink: #111827;
      --ink-soft: #4B5563;
      --gray: #9CA3AF;
      --line: #E5E7EB;
      --bg-soft: #FAFAFA;
      --radius: 8px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${p?"padding: 20px;":"padding: 16px;"}
      font-size: 11px;
    }

    /* @page margins removed — caused hangs on iOS WKWebView print renderer.
       Body padding (20px) provides sufficient margin instead. */

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 800;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 0;
      position: relative;
      z-index: 1;
    }
    .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
    .header-center {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 8px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.3;
    }
    .project-brand-logo {
      width: 60px; height: 60px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .project-brand-initials {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--green);
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: 1px;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 9px;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 4px;
    }
    .header-right {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .report-id {
      font-family: monospace;
      font-size: 10px;
      color: var(--gray);
      letter-spacing: 0.5px;
    }
    .header-rule {
      border: none;
      border-top: 3px solid var(--green);
      margin: 0 0 20px;
    }

    /* ── Info block ── */
    .info-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }

    /* ── Status Hero ── */
    .status-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      padding: 16px 20px;
      border-radius: var(--radius);
      color: #fff;
      margin-bottom: 16px;
      ${p?"page-break-inside: avoid;":""}
    }
    .hero-pass { background: var(--green); }
    .hero-fail { background: var(--red); }
    .hero-pending { background: var(--amber); }
    .status-hero-icon {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
    }
    .status-hero-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* Inline status badge (used inside conclusion card) */
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .status-pass { background: var(--green-tint); color: var(--green-dark); }
    .status-fail { background: var(--red-tint); color: var(--red); }
    .status-pending { background: var(--amber-bg); color: var(--amber); }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      min-width: 24px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 500; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin-bottom: 4px; margin-top: 8px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--green);
      padding-left: 10px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .section-num {
      color: var(--green);
      font-weight: 800;
    }
    .section-pipe { color: var(--green); font-weight: 700; margin: 0 2px; }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid #E8E6E0;
      border-radius: var(--radius);
      padding: 12px;
      margin-bottom: 8px;
      ${p?"page-break-inside: avoid;":""}
    }
    .question-card.is-failed {
      border-left: 3px solid var(--red);
    }
    .question-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .question-answer { font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
    .answer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .pill-yes { background: var(--green-tint); color: var(--green-dark); }
    .pill-no  { background: var(--red-tint); color: var(--red); }
    .pill-empty { color: var(--gray); font-style: italic; font-size: 12px; }

    .question-comment {
      font-size: 11px;
      color: var(--ink-soft);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: var(--bg-soft);
      border-radius: 6px;
      border-left: 3px solid var(--line);
    }
    .question-notes {
      font-size: 11px;
      color: var(--amber);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: #FFFBEB;
      border-radius: 6px;
      border-left: 3px solid #F59E0B;
    }

    /* ── Photo grid ── */
    .photo-section-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .photo-grid.single { grid-template-columns: 1fr; }
    .photo-item {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    .photo-img-wrap {
      width: 100%;
      max-height: 200px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 9px;
      color: var(--gray);
      text-align: center;
      padding: 5px 8px;
    }
    .photo-location {
      color: var(--ink-soft);
      font-style: italic;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: var(--bg-soft);
      font-size: 10px;
      color: var(--gray);
    }

    /* ── Component table ── */
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table thead th { background: #F5F3EE; color: var(--ink); }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }
    .data-table tbody th {
      background: var(--bg-soft);
      color: var(--ink);
      font-weight: 600;
    }
    .data-table td {
      padding: 8px 10px;
      border-top: 1px solid #F3F4F6;
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: #FAFAFA; }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Conclusion ── */
    .conclusion-card {
      background: #fff;
      border: 1px solid var(--line);
      border-left: 4px solid var(--green);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin: 16px 0;
      ${p?"page-break-inside: avoid;":""}
      position: relative;
      z-index: 1;
    }
    .conclusion-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--green);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .conclusion-text {
      font-size: 14px;
      color: var(--ink);
      line-height: 1.7;
      margin-bottom: 12px;
    }

    /* ── Signatures ── */
    .signatures-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 12px;
      position: relative;
      z-index: 1;
    }
    .signatures-header-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-header-rule { flex: 1; height: 1px; background: var(--line); }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      position: relative;
      z-index: 1;
    }
    .sig-block {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${p?"page-break-inside: avoid;":""}
    }
    .sig-block.is-expert {
      background: var(--green-tint);
      border-color: var(--green);
    }
    .sig-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 2px;
    }
    .sig-role {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
      margin-bottom: 2px;
    }
    .sig-position {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 10px;
    }
    .sig-img-box {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      background: #fff;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img-box img {
      max-width: 160px;
      max-height: 80px;
      display: block;
    }
    .sig-date {
      font-size: 10px;
      color: var(--gray);
      margin-top: 8px;
    }

    .audit-trail {
      font-size: 9px;
      color: var(--gray);
      margin-top: 8px;
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong { color: var(--ink-soft); font-weight: 600; }

    /* ── Certificates ── */
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cert-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${p?"page-break-inside: avoid;":""}
    }
    .cert-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 6px;
    }
    .cert-meta-row {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 2px;
    }
    .cert-meta-label { color: var(--gray); font-weight: 600; }
    .cert-img-wrap {
      margin-top: 10px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      aspect-ratio: 16 / 9;
      background: var(--bg-soft);
    }
    .cert-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .sig-block, .section,
      .conclusion-card, .cert-card, .status-hero {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${H}

  <div class="report-header">
    <div class="header-left">
      ${ze(s)}
    </div>
    <div class="header-center">
      <div class="report-title">${o(c.name)}</div>
    </div>
    <div class="header-right">
      <div class="report-id">${b}</div>
    </div>
  </div>
  <hr class="header-rule" />

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${i("pdf.infoCompany")}</span>
      <span class="info-value">${o(s.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${i("pdf.infoObject")}</span>
      <span class="info-value">${o(s.address??"—")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${i("pdf.metaDate",{date:""}).replace(/[:：].*/,"").trim()||"თარიღი"}</span>
      <span class="info-value">${v}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${b}</span>
    </div>
    ${c.category==="harness"?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${i("pdf.infoHarness")}</span>
      <span class="info-value">${o(t.harness_name??"—")}</span>
    </div>`:""}
    ${S?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${o(S)}</span>
    </div>`:""}
  </div>

  ${B}

  <div class="toc-box">
    <div class="toc-heading">${i("pdf.tocTitle")}</div>
    ${T}
    ${l.length>0?`
    <div class="toc-item">
      <span class="toc-num">${M(P.length+1)}</span>
      <span class="toc-name">${i("pdf.attachedCerts")}</span>
      <span class="toc-count">${l.length}</span>
    </div>`:""}
  </div>

  ${L}

  <div class="conclusion-card">
    <div class="conclusion-label">${i("pdf.conclusionTitle")}</div>
    <div class="conclusion-text">${o(t.conclusion_text??"—")}</div>
    ${I}
  </div>

  <div class="signatures-header">
    <span class="signatures-header-text">${i("pdf.signaturesTitle")}</span>
    <div class="signatures-header-rule"></div>
  </div>
  <div class="sig-grid">${F}</div>

  ${_}
</body>
</html>`}function Ce(a,t,c=[],s=!1,e){const r=t!=null&&t.comment?`<div class="question-comment">${e("pdf.commentLabel")}: ${o(t.comment)}</div>`:"",u=t!=null&&t.notes?`<div class="question-notes">${e("pdf.notesLabel")}: ${o(t.notes)}</div>`:"",m=c.length===1?"photo-grid single":"photo-grid",l=c.length>0?`<div class="photo-section-title">${e("pdf.photosTitle")}</div>
         <div class="${m}">${c.map(i=>Te(i,s,a.title,e)).join("")}</div>`:"",d=`question-card${s?" is-failed":""}`;switch(a.type){case"yesno":{const i=t==null?void 0:t.value_bool,p=i===!0?`<span class="answer-pill pill-yes">✓ ${e("pdf.yes")}</span>`:i===!1?`<span class="answer-pill pill-no">✗ ${e("pdf.no")}</span>`:'<span class="pill-empty">—</span>';return`<div class="${d}">
        <div class="question-title">${o(a.title)}</div>
        <div class="question-answer">${p}</div>
        ${r}${u}${l}
      </div>`}case"measure":{const i=t==null?void 0:t.value_num;return`<div class="${d}">
        <div class="question-title">${o(a.title)}</div>
        <div class="question-answer">${i??"—"} ${o(a.unit??"")}</div>
        ${r}${u}${l}
      </div>`}case"freetext":return`<div class="${d}">
        <div class="question-title">${o(a.title)}</div>
        <div class="question-answer">${o((t==null?void 0:t.value_text)??"—")}</div>
        ${r}${u}${l}
      </div>`;case"photo_upload":return`<div class="${d}">
        <div class="question-title">${o(a.title)}</div>
        ${l}${r}${u}
      </div>`;case"component_grid":{const i=a.grid_rows??[],p=a.grid_cols??[],y=(t==null?void 0:t.grid_values)??{},j=p.map(b=>`<th>${o(b)}</th>`).join(""),v=i.map(b=>{const S=p.map(F=>{var _;return((_=y[b])==null?void 0:_[F])??""}),P=S.some(F=>je(F)),T=p.map((F,_)=>{const h=S[_],w=De(h);return w==="pass"?`<td><span class="cell-status cell-status--pass">${o(h)}</span></td>`:w==="fail"?`<td><span class="cell-status cell-status--fail">${o(h)}</span></td>`:w==="neutral"?`<td><span class="cell-status cell-status--neutral">${o(h)}</span></td>`:`<td>${o(h)}</td>`}).join("");return`<tr${P?' class="is-problem"':""}><th>${o(b)}</th>${T}</tr>`}).join("");return`<div class="${d}">
        <div class="question-title">${o(a.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${j}</tr></thead>
            <tbody>${v}</tbody>
          </table>
        </div>
        ${r}${u}${l}
      </div>`}default:return""}}function je(a){const t=(a??"").trim().toLocaleLowerCase("ka-GE");return t?/(პრობლემ|აღენიშნება|არა|fail|no|broken|damaged|defect)/i.test(t):!1}function De(a){const t=(a??"").trim().toLocaleLowerCase("ka-GE");return t?/(პრობლემ|აღენიშნება|არა|fail|no|broken|damaged|defect)/i.test(t)?"fail":/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(t)?"pass":/არ გააჩნია/i.test(t)?"neutral":null:null}function Te(a,t,c,s){var v,b;const e=o(c.slice(0,50)),r=a.created_at?Le(a.created_at):"",u=r?`${e} — ${r}`:e,m=((v=a.caption)==null?void 0:v.startsWith("row:"))??!1,l=a.address??((b=a.caption)!=null&&b.startsWith("addr:")?a.caption.slice(5):null);let d="";l?d=`<div class="photo-caption photo-location">გადაღებულია: ${o(l)}</div>`:!m&&a.caption&&(d=`<div class="photo-caption">${o(a.caption)}</div>`);const i=a.storage_path,p=i.startsWith("data:"),y=/^(file|content|ph|asset):\/\//.test(i),j=/^https?:\/\//.test(i);return!p&&!y&&!j?`<div class="photo-item${t?" failed":""}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${s("pdf.imageUnavailable")}</div>
      </div>
      <div class="photo-caption">${u}</div>
      ${d}
    </div>`:`<div class="photo-item${t?" failed":""}">
    <div class="photo-img-wrap">
      <img src="${o(i)}" alt="${o(s("pdf.photoAlt"))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${o(s("pdf.imageUnavailable"))}</div>';" />
    </div>
    <div class="photo-caption">${u}</div>
    ${d}
  </div>`}function Ee(a){const t=/^data:image\/\w+;base64,.{32,}$/,c=a.filter(e=>e.status==="signed"&&!!e.signature_png_url&&t.test(e.signature_png_url));return[...c.filter(e=>e.signer_role==="expert"),...c.filter(e=>e.signer_role!=="expert")].map(e=>{const r=e.signer_role,u=r?r==="expert"?D("pdf.expertLabel")??"Expert":D(`roles.${r.replace(/_([a-z])/g,(p,y)=>y.toUpperCase())}`)??Z[r]??r:"ხელმომწერი",m=e.signed_at?new Date(e.signed_at).toLocaleDateString("ka-GE"):"",l=e.signed_at?new Date(e.signed_at).toLocaleTimeString("ka-GE",{hour:"2-digit",minute:"2-digit"}):"",d=[];m&&d.push(`<strong>${D("pdf.timeLabel")}:</strong> ${m} ${l}`),e.latitude!=null&&e.longitude!=null&&d.push(`<strong>${D("pdf.locationLabel")}:</strong> ${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`),e.device_id_hash&&d.push(`<strong>${D("pdf.deviceLabel")}:</strong> ${o(e.device_id_hash.slice(0,8))}…`),e.ip_address&&d.push(`<strong>IP:</strong> ${o(e.ip_address)}`);const i=d.length?`<div class="audit-trail">${d.join(" · ")}</div>`:"";return`
      <div class="sig-block${e.signer_role==="expert"?" is-expert":""}">
        <div class="sig-name">${o(e.full_name||"—")}</div>
        <div class="sig-role">${o(u)}</div>
        ${e.position?`<div class="sig-position">${o(e.position)}</div>`:""}
        <div class="sig-img-box">
          <img src="${o(e.signature_png_url??"")}" alt="${o(D("pdf.signatureAlt")??"Signature")}" />
        </div>
        ${m?`<div class="sig-date">${o(m)}</div>`:""}
        ${i}
      </div>`}).join("")}function Le(a){const t=new Date(a),c=String(t.getDate()).padStart(2,"0"),s=String(t.getMonth()+1).padStart(2,"0"),e=t.getFullYear(),r=String(t.getHours()).padStart(2,"0"),u=String(t.getMinutes()).padStart(2,"0");return`${c}.${s}.${e} ${r}:${u}`}function M(a){return String(a).padStart(2,"0")}function ze(a){if(a.logo)return`<img class="project-brand-logo" src="${o(a.logo)}" alt="${o(a.company_name||a.name)}" />`;const t=(a.company_name||a.name||"").trim(),c=t?Array.from(t).slice(0,2).join("").toLocaleUpperCase("ka-GE"):"—";return`<div class="project-brand-initials">${o(c)}</div>`}function o(a){return a==null?"":a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Me(){var h,w,z,A,q,B,I,H;const{id:a}=O(),[t]=U(),c=t.get("preview")==="1",s=N.useRef(null),e=E({queryKey:["inspection",a],queryFn:()=>Q(a),enabled:!!a}),r=E({queryKey:["project",(h=e.data)==null?void 0:h.project_id],queryFn:()=>K(e.data.project_id),enabled:!!((w=e.data)!=null&&w.project_id)}),u=E({queryKey:["template",(z=e.data)==null?void 0:z.template_id],queryFn:()=>V(e.data.template_id),enabled:!!((A=e.data)!=null&&A.template_id)}),m=E({queryKey:["questions",(q=e.data)==null?void 0:q.template_id],queryFn:()=>Y(e.data.template_id),enabled:!!((B=e.data)!=null&&B.template_id)}),l=E({queryKey:["answers",a],queryFn:()=>J(a),enabled:!!a}),[d,i]=N.useState({}),[p,y]=N.useState(!1);N.useEffect(()=>{if(!l.data)return;const g=l.data.map(n=>n.id);if(!g.length){y(!0);return}G(g).then(async n=>{const f={};await Promise.all(Object.entries(n).map(async([C,$])=>{f[C]=await Promise.all($.map(async x=>{try{const X=await W(x.storage_path);return{...x,storage_path:X}}catch{return x}}))})),i(f),y(!0)}).catch(()=>y(!0))},[l.data]);const j=e.isSuccess&&r.isSuccess&&u.isSuccess&&m.isSuccess&&l.isSuccess&&p;if(e.isLoading)return k.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!e.data)return k.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!j)return k.jsx("p",{style:{padding:24},children:"იტვირთება…"});const v=e.data,b=r.data,S=u.data,P=m.data??[],T=l.data??[],L=(v.signatories??[]).map(g=>({id:"",inspection_id:v.id,signer_role:g.role,full_name:g.name,phone:null,position:null,signature_png_url:g.signature.startsWith("data:")?g.signature:`data:image/png;base64,${g.signature}`,signed_at:g.signed_at,status:"signed",person_name:null})),F=S||{id:v.template_id,owner_id:null,name:"შემოწმების აქტი",category:((H=(I=v.template)==null?void 0:I[0])==null?void 0:H.category)??null,is_system:!1,required_qualifications:[],required_signer_roles:[]},_=_e({questionnaire:v,template:F,project:b,questions:P,answers:T,signatures:L,photosByAnswer:d,mode:"pdf"});return k.jsxs(k.Fragment,{children:[k.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[k.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),k.jsx("button",{onClick:()=>{var g,n;return(n=(g=s.current)==null?void 0:g.contentWindow)==null?void 0:n.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),k.jsx("iframe",{ref:s,srcDoc:_,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:"შემოწმების აქტი",onLoad:()=>{var g,n;c||(n=(g=s.current)==null?void 0:g.contentWindow)==null||n.print()}})]})}export{Me as default};
